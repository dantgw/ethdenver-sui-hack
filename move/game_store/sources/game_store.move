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
    use std::string::{Self, String};

    // Errors
    const EInvalidPrice: u64 = 0;
    const EGameNotFound: u64 = 1;
    const EInsufficientFunds: u64 = 2;

    // Game struct representing a game in the store
    struct Game has key, store {
        id: UID,
        name: String,
        description: String,
        price: u64,
        developer: address,
    }

    // GameStore capability
    struct GameStore has key {
        id: UID,
        games: Table<String, Game>,
        profits: Coin<SUI>
    }

    // GameLicense represents ownership of a game
    struct GameLicense has key {
        id: UID,
        game_name: String,
        owner: address
    }

    // Initialize the game store
    fun init(ctx: &mut TxContext) {
        let store = GameStore {
            id: object::new(ctx),
            games: table::new(ctx),
            profits: coin::zero(ctx)
        };
        transfer::share_object(store);
    }

    // List a new game in the store
    public entry fun list_game(
        store: &mut GameStore,
        name: vector<u8>,
        description: vector<u8>,
        price: u64,
        ctx: &mut TxContext
    ) {
        assert!(price > 0, EInvalidPrice);
        
        let game = Game {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            price,
            developer: tx_context::sender(ctx)
        };

        table::add(&mut store.games, string::utf8(name), game);
    }

    // Purchase a game
    public entry fun purchase_game(
        store: &mut GameStore,
        game_name: vector<u8>,
        payment: &mut Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let name = string::utf8(game_name);
        assert!(table::contains(&store.games, name), EGameNotFound);
        
        let game = table::borrow(&store.games, name);
        assert!(coin::value(payment) >= game.price, EInsufficientFunds);

        // Transfer payment
        let paid = coin::split(payment, game.price, ctx);
        coin::join(&mut store.profits, paid);

        // Create and transfer game license to buyer
        let license = GameLicense {
            id: object::new(ctx),
            game_name: name,
            owner: tx_context::sender(ctx)
        };

        transfer::transfer(license, tx_context::sender(ctx));
    }

    // Get game details
    public fun get_game_details(store: &GameStore, name: String): (String, String, u64, address) {
        let game = table::borrow(&store.games, name);
        (game.name, game.description, game.price, game.developer)
    }
}


