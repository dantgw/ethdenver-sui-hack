import { Button } from "@/components/ui/button";
import { GAME_STORE_ID } from "@/constants";
import {
  useCurrentAccount,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { useEffect, useState } from "react";

// Add mock data for demonstration
const featuredGames = [
  {
    id: 1,
    title: "Legends",
    image: "/images/game_1.jpeg",
    price: "0.8 SUI",
    tags: ["Action", "Adventure"],
    rating: 4.9,
    releaseDate: "2024-03-15",
  },
  {
    id: 2,
    title: "Gang of Warriors",
    image: "/images/game_2.jpeg",
    price: "0.3 SUI",
    tags: ["Strategy", "Multiplayer"],
    rating: 4.8,
  },
  {
    id: 3,
    title: "Quantum Raiders",
    image: "/images/game_3.jpeg",
    price: "0.7 SUI",
    tags: ["Sci-Fi", "Shooter"],
    rating: 4.2,
  },
  {
    id: 4,
    title: "Temple Finders",
    image: "/images/game_4.jpeg",
    price: "0.4 SUI",
    tags: ["Action", "Adventure"],
    rating: 3.9,
  },
];

const categories = [
  { id: "new", name: "New & Trending" },
  { id: "top", name: "Top Sellers" },
  { id: "upcoming", name: "Upcoming" },
  { id: "specials", name: "Specials" },
];

// Add new interface for Game type
interface GameData {
  id: string;
  title: string;
  image: string;
  price: string;
  tags: string[];
  rating: number;
  releaseDate: string;
}

// Add these interfaces at the top of the file with your other interfaces
interface SuiGameFields {
  cover_image_blob_id: string;
  current_content_blob_id: string;
  current_version: string;
  description: string;
  developer: string;
  game_id: string;
  id: { id: string };
  owner: string;
  price: string;
  title: string;
  version_history: {
    type: string;
    fields: {
      id: { id: string };
      size: string;
    };
  };
}

interface SuiGameObject {
  data: {
    content: {
      fields: {
        value: {
          fields: SuiGameFields;
        };
      };
    };
  };
}

export function HomePage() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const [selectedCategory, setSelectedCategory] = useState("new");
  const [counterId, setCounter] = useState(() => {
    const hash = window.location.hash.slice(1);
    return isValidSuiObjectId(hash) ? hash : null;
  });
  const { data, isPending, error, refetch } = useSuiClientQuery("getObject", {
    id: GAME_STORE_ID,
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  const { data: gamesTable } = useSuiClientQuery("getDynamicFields", {
    parentId:
      "0x0e3084d694e47e43d1f987d69cf40a434916475b0bbce6f4d6425fdc75364089",
  });

  // Update the useSuiClientQuery type
  const { data: gameObjects } = useSuiClientQuery<SuiGameObject[]>(
    "multiGetObjects",
    {
      ids: gamesTable?.data?.map((field) => field.objectId) || [],
      options: { showContent: true },
    },
    {
      enabled: !!gamesTable?.data?.length,
    },
  );

  useEffect(() => {
    if (gameObjects) {
      const games: GameData[] = gameObjects.map((obj) => {
        const gameFields = obj.data?.content?.fields?.value?.fields || {};
        return {
          id: gameFields.game_id?.toString() || "",
          title: gameFields.title || "",
          image: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${gameFields.cover_image_blob_id}`,
          price: gameFields.price
            ? `${Number(gameFields.price) / 1000000000} SUI`
            : "Free",
          tags: ["Game"],
          rating: 5,
          releaseDate: new Date().toISOString(),
        };
      });
      setLatestGames(games);
    }
  }, [gameObjects]);

  const [latestGames, setLatestGames] = useState<GameData[]>([]);
  const fetchGames = async () => {
    try {
      console.log("fetchGames");
      console.log("data", data);
      console.log("data2", data2);

      console.log(data?.data?.content?.fields?.games?.fields?.id);
      const tableId =
        "0x0e3084d694e47e43d1f987d69cf40a434916475b0bbce6f4d6425fdc75364089";

      // To read a specific game by its ID (key)
      const gameId = "1"; // or whatever game ID you want to read
      const dynamicFieldName = {
        type: "u64",
        value: gameId,
      };

      const gameData = await suiClient.getDynamicFieldObject({
        parentId: tableId,
        name: dynamicFieldName,
      });

      // To get all games, you can use getDynamicFields
      const allGames = await suiClient.getDynamicFields({
        parentId: tableId,
      });

      console.log("allGames", allGames);

      // Get the game counter from the store data
      // const gameCounter = parseInt(
      //   data?.data?.content?.fields?.game_counter || "0",
      // );

      // // Create array of promises to fetch each game's details
      // const gamesPromises = Array.from(
      //   { length: gameCounter },
      //   async (_, i) => {
      //     const tx = new Transaction();
      //     tx.moveCall({
      //       arguments: [tx.object(GAME_STORE_ID), tx.pure.u64(i + 1)],
      //       target: `${GAME_STORE_ID}::store::get_game_details`,
      //     });

      //     const gameDetails = await suiClient.devInspectTransactionBlock({
      //       transactionBlock: tx,
      //       sender: currentAccount?.address || "",
      //     });

      //     const [
      //       id,
      //       title,
      //       description,
      //       cover_image_blob_id,
      //       content_blob_id,
      //       current_version,
      //       price,
      //       developer,
      //       owner,
      //     ] = gameDetails.results?.[0]?.returnValues || [];

      //     return {
      //       id: id.toString(),
      //       title,
      //       image: cover_image_blob_id,
      //       price: price ? `${price} SUI` : "Free",
      //       tags: ["Game"],
      //       rating: 5,
      //       releaseDate: new Date().toISOString(),
      //     };
      //   },
      // );

      // const games = await Promise.all(gamesPromises);
      // setLatestGames(games);
    } catch (error) {
      console.error("Error fetching games:", error);
    }
  };
  useEffect(() => {
    fetchGames();
  }, [suiClient, data]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#1a1a1a] text-white">
      {/* Hero Section */}
      <div className="relative h-[500px] w-full">
        <div className="absolute inset-0">
          <img
            src="/images/game_5.jpeg"
            alt="Featured Game"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
        </div>
        <div className="absolute bottom-4 left-0 right-0 p-8 max-w-7xl mx-auto flex flex-col gap-y-4">
          <h1 className="text-5xl font-bold mb-4">Pigs Can Fly</h1>
          <p className="text-xl text-gray-300 mb-6 max-w-2xl">
            Experience the future of gaming on the Sui blockchain. Own, trade,
            and play like never before.
          </p>
          <div className="flex gap-4">
            <Button
              size="lg"
              className="bg-[#8A2BE2] hover:bg-[#9B4AE6] text-white font-bold cursor-pointer"
            >
              <span className="font-bold">Play Now</span>
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
            >
              <span className="font-bold">Add to Wishlist</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 w-full flex flex-col gap-y-8">
        {/* Categories */}

        {/* Featured Games Grid */}
        <section className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between mb-8 ">
            <h2 className="text-2xl font-bold tracking-tight">Featured</h2>
            <a
              href="#"
              className="text-[#00BFFF] hover:text-[#33CCFF] font-medium"
            >
              View all →
            </a>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {featuredGames.map((game) => (
              <div
                key={game.id}
                className="relative rounded-lg overflow-hidden group cursor-pointer"
              >
                <img
                  src={game.image}
                  alt={game.title}
                  className="w-full h-[300px] object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent p-6 flex flex-col justify-end">
                  <div className="flex items-center gap-2 mb-2">
                    {game.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-white/20 px-2 py-1 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{game.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">{game.price}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span>{game.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Latest Games */}
        <section className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              Latest Releases
            </h2>
            <a
              href="#"
              className="text-[#00BFFF] hover:text-[#33CCFF] font-medium"
            >
              View all →
            </a>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {latestGames.map((game) => (
              <div
                key={game.id}
                className="bg-[#2a2a2a] rounded-lg overflow-hidden group cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="w-full aspect-[16/9] object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      // Fallback image if IPFS image fails to load
                      e.currentTarget.src = "/images/game_placeholder.jpeg";
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span className="text-sm">{game.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {game.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-white/10 px-2 py-1 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-lg font-medium mb-2">{game.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[#00B347]">
                      {game.price}
                    </span>
                    <span className="text-sm text-gray-400">
                      {new Date(game.releaseDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Popular Games */}
        <section className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Popular Games</h2>
            <a
              href="#"
              className="text-[#00BFFF] hover:text-[#33CCFF] font-medium"
            >
              View all →
            </a>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {featuredGames.map((game) => (
              <div
                key={game.id}
                className="bg-[#2a2a2a] rounded-lg overflow-hidden group cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="w-full aspect-[3/4] object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span className="text-sm">{game.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {game.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-white/10 px-2 py-1 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-lg font-medium mb-2">{game.title}</h3>
                  <span className="text-lg font-semibold text-[#00B347]">
                    {game.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
