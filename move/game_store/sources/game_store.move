/*
/// Module: game_store
module game_store::game_store;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

module game_store::store {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::display;
    use sui::package;
    use std::string::{Self, String, utf8};
    use std::option::{Self, Option};
    use std::vector;

    // Errors
    const EInvalidPrice: u64 = 0;
    const EGameNotFound: u64 = 1;
    const EInsufficientFunds: u64 = 2;
    const EInvalidVersion: u64 = 3;
    const ENotGameDeveloper: u64 = 4;
    const ENotGameOwner: u64 = 5;
    const EAlreadyOwned: u64 = 6;

    /// One-Time-Witness for the package
    public struct STORE has drop {}

    /// Represents a specific version of a game's content
    public struct GameVersion has store {
        version: u64,
        content_blob_id: String,
        release_notes: Option<String>,
        timestamp: u64
    }

    /// Game struct representing a game in the store
    public struct Game has key, store {
        id: UID,
        game_id: u64,
        title: String,
        description: Option<String>,
        cover_image_blob_id: String,
        current_version: u64,
        current_content_blob_id: String,
        price: Option<u64>,
        developer: address,  // Original creator (cannot be changed)
        owner: address,      // Current owner (can be transferred)
        version_history: Table<u64, GameVersion>
    }

    /// GameStore capability
    public struct GameStore has key {
        id: UID,
        games: Table<u64, Game>,
        game_counter: u64,
        profits: Coin<SUI>
    }

    /// GameLicense represents ownership of a game
    public struct GameLicense has key {
        id: UID,
        game_id: u64,
        game_title: String,
        owner: address,
        purchased_version: u64
    }

    fun init(otw: STORE, ctx: &mut TxContext) {
        let store = GameStore {
            id: object::new(ctx),
            games: table::new(ctx),
            game_counter: 0,
            profits: coin::zero(ctx)
        };

        // Create the Publisher object
        let publisher = package::claim(otw, ctx);

        // Set up the display for Game objects
        let mut display_game = display::new_with_fields<Game>(
            &publisher,
            vector[
                utf8(b"name"),
                utf8(b"image_url"),
                utf8(b"description"),
                utf8(b"version"),
                utf8(b"creator"),
                utf8(b"price"),
                utf8(b"game_id"),
            ],
            vector[
                utf8(b"{title}"),
                utf8(b"{cover_image_blob_id}"),
                utf8(b"{description}"),
                utf8(b"v{current_version}"),
                utf8(b"{developer}"),
                utf8(b"{price} SUI"),
                utf8(b"#{game_id}"),
            ],
            ctx
        );

        // Set up the display for GameLicense objects
        let mut display_license = display::new_with_fields<GameLicense>(
            &publisher,
            vector[
                utf8(b"name"),
                utf8(b"description"),
                utf8(b"version"),
                utf8(b"game_id"),
            ],
            vector[
                utf8(b"License: {game_title}"),
                utf8(b"Game License for {game_title}"),
                utf8(b"v{purchased_version}"),
                utf8(b"#{game_id}"),
            ],
            ctx
        );

        // Commit the displays and share them
        display::update_version(&mut display_game);
        display::update_version(&mut display_license);
        transfer::public_share_object(display_game);
        transfer::public_share_object(display_license);

        // Clean up
        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::share_object(store);
    }

    // List a new game in the store
    public entry fun list_game(
        store: &mut GameStore,
        title: vector<u8>,
        description: vector<u8>,
        cover_image_blob_id: vector<u8>,
        content_blob_id: vector<u8>,
        price: Option<u64>,
        ctx: &mut TxContext
    ) {
        // Generate new game ID
        let game_id = store.game_counter + 1;
        store.game_counter = game_id;

        let sender = tx_context::sender(ctx);
        let mut game = Game {
            id: object::new(ctx),
            game_id,
            title: string::utf8(title),
            description: if (vector::length(&description) > 0) {
                option::some(string::utf8(description))
            } else {
                option::none()
            },
            cover_image_blob_id: string::utf8(cover_image_blob_id),
            current_version: 1,
            current_content_blob_id: string::utf8(content_blob_id),
            price,
            developer: sender,
            owner: sender,
            version_history: table::new(ctx)
        };

        // Add initial version to history
        let initial_version = GameVersion {
            version: 1,
            content_blob_id: string::utf8(content_blob_id),
            release_notes: option::none(),
            timestamp: tx_context::epoch(ctx)
        };
        table::add(&mut game.version_history, 1, initial_version);

        table::add(&mut store.games, game_id, game);
    }

    // Transfer game ownership
    public entry fun transfer_game_ownership(
        store: &mut GameStore,
        game_id: u64,
        new_owner: address,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&store.games, game_id), EGameNotFound);
        let game = table::borrow_mut(&mut store.games, game_id);
        assert!(game.owner == tx_context::sender(ctx), ENotGameOwner);
        game.owner = new_owner;
    }

    // Update game content and create new version (only owner can update)
    public entry fun update_game_version(
        store: &mut GameStore,
        game_id: u64,
        new_content_blob_id: vector<u8>,
        release_notes: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&store.games, game_id), EGameNotFound);
        
        let game = table::borrow_mut(&mut store.games, game_id);
        assert!(game.owner == tx_context::sender(ctx), ENotGameOwner);

        // Create new version
        let new_version = game.current_version + 1;
        let version_entry = GameVersion {
            version: new_version,
            content_blob_id: string::utf8(new_content_blob_id),
            release_notes: if (vector::length(&release_notes) > 0) {
                option::some(string::utf8(release_notes))
            } else {
                option::none()
            },
            timestamp: tx_context::epoch(ctx)
        };

        // Update game
        game.current_version = new_version;
        game.current_content_blob_id = string::utf8(new_content_blob_id);
        table::add(&mut game.version_history, new_version, version_entry);
    }

    // Purchase a game
    public entry fun purchase_game(
        store: &mut GameStore,
        game_id: u64,
        payment: &mut Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&store.games, game_id), EGameNotFound);
        
        let game = table::borrow(&store.games, game_id);
        
        // Handle payment only if the game has a price
        if (option::is_some(&game.price)) {
            let price = option::borrow(&game.price);
            assert!(coin::value(payment) >= *price, EInsufficientFunds);

            // Transfer payment
            let paid = coin::split(payment, *price, ctx);
            coin::join(&mut store.profits, paid);
        };

        // Create and transfer game license to buyer
        let license = GameLicense {
            id: object::new(ctx),
            game_id,
            game_title: game.title,
            owner: tx_context::sender(ctx),
            purchased_version: game.current_version
        };

        transfer::transfer(license, tx_context::sender(ctx));
    }

    // Get game details (now includes owner)
    public fun get_game_details(store: &GameStore, game_id: u64): (
        u64,
        String,
        Option<String>,
        String,
        String,
        u64,
        Option<u64>,
        address,  // developer
        address   // owner
    ) {
        let game = table::borrow(&store.games, game_id);
        (
            game.game_id,
            game.title,
            game.description,
            game.cover_image_blob_id,
            game.current_content_blob_id,
            game.current_version,
            game.price,
            game.developer,
            game.owner
        )
    }

    // Get specific version details
    public fun get_version_details(
        store: &GameStore,
        game_id: u64,
        version: u64
    ): (String, Option<String>, u64) {
        let game = table::borrow(&store.games, game_id);
        assert!(table::contains(&game.version_history, version), EInvalidVersion);
        
        let version_info = table::borrow(&game.version_history, version);
        (
            version_info.content_blob_id,
            version_info.release_notes,
            version_info.timestamp
        )
    }

    // Get all games by a developer
    public fun get_developer_games(store: &GameStore, developer_address: address): vector<u64> {
        let mut game_ids = vector::empty();
        let mut i = 0;
        
        while (i <= store.game_counter) {
            if (table::contains(&store.games, i)) {
                let game = table::borrow(&store.games, i);
                if (game.developer == developer_address) {
                    vector::push_back(&mut game_ids, i);
                };
            };
            i = i + 1;
        };
        
        game_ids
    }

    // Get all games in the store
    public fun get_all_games(store: &GameStore): vector<u64> {
        let mut game_ids = vector::empty();
        let mut i = 0;
        
        while (i <= store.game_counter) {
            if (table::contains(&store.games, i)) {
                vector::push_back(&mut game_ids, i);
            };
            i = i + 1;
        };
        
        game_ids
    }

    // Get all free games
    public fun get_free_games(store: &GameStore): vector<u64> {
        let mut game_ids = vector::empty();
        let mut i = 0;
        
        while (i <= store.game_counter) {
            if (table::contains(&store.games, i)) {
                let game = table::borrow(&store.games, i);
                if (option::is_none(&game.price)) {
                    vector::push_back(&mut game_ids, i);
                };
            };
            i = i + 1;
        };
        
        game_ids
    }

    // Get games by version
    public fun get_games_by_version(store: &GameStore, version: u64): vector<u64> {
        let mut game_ids = vector::empty();
        let mut i = 0;
        
        while (i <= store.game_counter) {
            if (table::contains(&store.games, i)) {
                let game = table::borrow(&store.games, i);
                if (game.current_version == version) {
                    vector::push_back(&mut game_ids, i);
                };
            };
            i = i + 1;
        };
        
        game_ids
    }

    // Get total number of games in store
    public fun get_total_games(store: &GameStore): u64 {
        let mut count = 0;
        let mut i = 0;
        
        while (i <= store.game_counter) {
            if (table::contains(&store.games, i)) {
                count = count + 1;
            };
            i = i + 1;
        };
        
        count
    }

    // Get games within price range
    public fun get_games_by_price_range(store: &GameStore, min_price: u64, max_price: u64): vector<u64> {
        let mut game_ids = vector::empty();
        let mut i = 0;
        
        while (i <= store.game_counter) {
            if (table::contains(&store.games, i)) {
                let game = table::borrow(&store.games, i);
                if (option::is_some(&game.price)) {
                    let price = *option::borrow(&game.price);
                    if (price >= min_price && price <= max_price) {
                        vector::push_back(&mut game_ids, i);
                    };
                };
            };
            i = i + 1;
        };
        
        game_ids
    }

    // Get all games owned by an address
    public fun get_owned_games(store: &GameStore, owner_address: address): vector<u64> {
        let mut game_ids = vector::empty();
        let mut i = 0;
        
        while (i <= store.game_counter) {
            if (table::contains(&store.games, i)) {
                let game = table::borrow(&store.games, i);
                if (game.owner == owner_address) {
                    vector::push_back(&mut game_ids, i);
                };
            };
            i = i + 1;
        };
        
        game_ids
    }

    // Check if an address is the owner of a game
    public fun is_game_owner(store: &GameStore, game_id: u64, address: address): bool {
        assert!(table::contains(&store.games, game_id), EGameNotFound);
        let game = table::borrow(&store.games, game_id);
        game.owner == address
    }

    // Check if an address is the developer of a game
    public fun is_game_developer(store: &GameStore, game_id: u64, address: address): bool {
        assert!(table::contains(&store.games, game_id), EGameNotFound);
        let game = table::borrow(&store.games, game_id);
        game.developer == address
    }
}


