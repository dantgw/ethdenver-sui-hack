/*
#[test_only]
module game_store::game_store_tests;
// uncomment this line to import the module
// use game_store::game_store;

const ENotImplemented: u64 = 0;

#[test]
fun test_game_store() {
    // pass
}

#[test, expected_failure(abort_code = ::game_store::game_store_tests::ENotImplemented)]
fun test_game_store_fail() {
    abort ENotImplemented
}
*/

#[test_only]
module game_store::game_store_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::test_utils::assert_eq;
    use std::option;
    use std::string::utf8;
    use std::vector;
    use game_store::store::{Self, GameStore, Game, GameLicense, STORE};

    // Test addresses
    const ADMIN: address = @0xA11CE;
    const DEVELOPER: address = @0xB0B;
    const PLAYER: address = @0xCAFE;

    // Test data
    const GAME_TITLE: vector<u8> = b"Awesome Game";
    const GAME_DESC: vector<u8> = b"An awesome game description";
    const COVER_IMAGE: vector<u8> = b"ipfs://cover-image-hash";
    const CONTENT_BLOB: vector<u8> = b"ipfs://game-content-hash";
    const GAME_PRICE: u64 = 1_000_000_000; // 1 SUI

    fun setup_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);
        {
            store::init_for_testing(ts::ctx(&mut scenario));
        };
        scenario
    }

    #[test]
    fun test_game_listing() {
        let mut scenario = setup_test();
        
        // List a game as developer
        ts::next_tx(&mut scenario, DEVELOPER);
        {
            let mut store_obj = ts::take_shared<GameStore>(&scenario);
            store::list_game(
                &mut store_obj,
                GAME_TITLE,
                GAME_DESC,
                COVER_IMAGE,
                CONTENT_BLOB,
                option::some(GAME_PRICE),
                ts::ctx(&mut scenario)
            );

            // Verify game details
            let (
                game_id,
                title,
                description,
                cover_image,
                content_blob,
                version,
                price,
                developer,
                owner
            ) = store::get_game_details(&store_obj, 1);

            assert_eq(game_id, 1);
            assert_eq(title, utf8(GAME_TITLE));
            assert_eq(*option::borrow(&description), utf8(GAME_DESC));
            assert_eq(cover_image, utf8(COVER_IMAGE));
            assert_eq(content_blob, utf8(CONTENT_BLOB));
            assert_eq(version, 1);
            assert_eq(*option::borrow(&price), GAME_PRICE);
            assert_eq(developer, DEVELOPER);
            assert_eq(owner, DEVELOPER);

            ts::return_shared(store_obj);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_game_purchase() {
        let mut scenario = setup_test();
        
        // List a game
        ts::next_tx(&mut scenario, DEVELOPER);
        {
            let mut store_obj = ts::take_shared<GameStore>(&scenario);
            store::list_game(
                &mut store_obj,
                GAME_TITLE,
                GAME_DESC,
                COVER_IMAGE,
                CONTENT_BLOB,
                option::some(GAME_PRICE),
                ts::ctx(&mut scenario)
            );
            ts::return_shared(store_obj);
        };

        // Purchase the game as player
        ts::next_tx(&mut scenario, PLAYER);
        {
            let mut store_obj = ts::take_shared<GameStore>(&scenario);
            let mut coin = coin::mint_for_testing<SUI>(GAME_PRICE, ts::ctx(&mut scenario));
            
            store::purchase_game(
                &mut store_obj,
                1, // game_id
                &mut coin,
                ts::ctx(&mut scenario)
            );

            // Clean up - use burn_for_testing instead of destroy_for_testing
            coin::burn_for_testing(coin);
            ts::return_shared(store_obj);

            // Verify player received the license
            assert!(ts::has_most_recent_for_address<GameLicense>(PLAYER), 0);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_update_game_version() {
        let mut scenario = setup_test();
        
        // List a game
        ts::next_tx(&mut scenario, DEVELOPER);
        {
            let mut store_obj = ts::take_shared<GameStore>(&scenario);
            store::list_game(
                &mut store_obj,
                GAME_TITLE,
                GAME_DESC,
                COVER_IMAGE,
                CONTENT_BLOB,
                option::some(GAME_PRICE),
                ts::ctx(&mut scenario)
            );

            // Update game version
            let new_content = b"ipfs://new-content-hash";
            let release_notes = b"Bug fixes and improvements";
            store::update_game_version(
                &mut store_obj,
                1, // game_id
                new_content,
                release_notes,
                ts::ctx(&mut scenario)
            );

            // Verify version update
            let (content_blob, notes, _) = store::get_version_details(&store_obj, 1, 2);
            assert_eq(content_blob, utf8(new_content));
            assert_eq(*option::borrow(&notes), utf8(release_notes));

            ts::return_shared(store_obj);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_game_queries() {
        let mut scenario = setup_test();
        
        // List multiple games
        ts::next_tx(&mut scenario, DEVELOPER);
        {
            let mut store_obj = ts::take_shared<GameStore>(&scenario);
            
            // List free game
            store::list_game(
                &mut store_obj,
                b"Free Game",
                b"",
                COVER_IMAGE,
                CONTENT_BLOB,
                option::none(),
                ts::ctx(&mut scenario)
            );

            // List paid game
            store::list_game(
                &mut store_obj,
                GAME_TITLE,
                GAME_DESC,
                COVER_IMAGE,
                CONTENT_BLOB,
                option::some(GAME_PRICE),
                ts::ctx(&mut scenario)
            );

            // Test queries
            let all_games = store::get_all_games(&store_obj);
            assert_eq(vector::length(&all_games), 2);

            let free_games = store::get_free_games(&store_obj);
            assert_eq(vector::length(&free_games), 1);

            let dev_games = store::get_developer_games(&store_obj, DEVELOPER);
            assert_eq(vector::length(&dev_games), 2);

            let price_range_games = store::get_games_by_price_range(&store_obj, 0, GAME_PRICE);
            assert_eq(vector::length(&price_range_games), 1);

            ts::return_shared(store_obj);
        };
        ts::end(scenario);
    }

    #[test]
    fun test_ownership_checks() {
        let mut scenario = setup_test();
        
        // List a game
        ts::next_tx(&mut scenario, DEVELOPER);
        {
            let mut store_obj = ts::take_shared<GameStore>(&scenario);
            store::list_game(
                &mut store_obj,
                GAME_TITLE,
                GAME_DESC,
                COVER_IMAGE,
                CONTENT_BLOB,
                option::some(GAME_PRICE),
                ts::ctx(&mut scenario)
            );

            // Check ownership
            assert!(store::is_game_developer(&store_obj, 1, DEVELOPER), 0);
            assert!(store::is_game_owner(&store_obj, 1, DEVELOPER), 0);
            
            // Transfer ownership
            store::transfer_game_ownership(
                &mut store_obj,
                1,
                PLAYER,
                ts::ctx(&mut scenario)
            );

            // Verify new ownership
            assert!(store::is_game_owner(&store_obj, 1, PLAYER), 0);
            // Developer should remain unchanged
            assert!(store::is_game_developer(&store_obj, 1, DEVELOPER), 0);

            ts::return_shared(store_obj);
        };
        ts::end(scenario);
    }
}
