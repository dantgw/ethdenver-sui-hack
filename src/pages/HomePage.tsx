import { Button } from "@/components/ui/button";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { useState } from "react";

// Add mock data for demonstration
const featuredGames = [
  {
    id: 1,
    title: "Legends",
    image: "/images/game_1.jpeg",
    price: "0.5 SUI",
    tags: ["Action", "RPG"],
    rating: 4.5,
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

const latestGames = [
  {
    id: 5,
    title: "Pigs Can Fly",
    image: "/images/game_5.jpeg",
    price: "0.8 SUI",
    tags: ["Casual", "Platformer"],
    rating: 4.9,
    releaseDate: "2024-03-15",
  },
  {
    id: 6,
    title: "Ghost Mansion",
    image: "/images/game_6.jpeg",
    price: "0.45 SUI",
    tags: ["Horror", "Action"],
    rating: 4.6,
    releaseDate: "2024-03-10",
  },
  {
    id: 7,
    title: "Fantasy Warrior",
    image: "/images/game_7.jpeg",
    price: "0.55 SUI",
    tags: ["Action", "Fantasy"],
    rating: 4.7,
    releaseDate: "2024-03-08",
  },
  {
    id: 8,
    title: "Cyber Racers",
    image: "/images/game_8.jpeg",
    price: "0.65 SUI",
    tags: ["Racing", "Open World"],
    rating: 4.8,
    releaseDate: "2024-03-05",
  },
  {
    id: 9,
    title: "Forest Fighter",
    image: "/images/game_9.jpeg",
    price: "0.75 SUI",
    tags: ["Action", "Multiplayer"],
    rating: 4.5,
    releaseDate: "2024-03-01",
  },
  {
    id: 10,
    title: "Neon Drift",
    image: "/images/game_10.jpeg",
    price: "0.8 SUI",
    tags: ["Action", "Cyberpunk"],
    rating: 4.9,
    releaseDate: "2024-03-15",
  },
];

const popularGames = [
  {
    id: 3,
    title: "Quantum Raiders",
    image: "/images/game_3.jpeg",
    price: "0.4 SUI",
    tags: ["Adventure", "Fantasy"],
    rating: 4.2,
  },
  {
    id: 4,
    title: "Temple Finders",
    image: "/images/game_4.jpeg",
    price: "0.6 SUI",
    tags: ["Action", "Adventure"],
    rating: 3.9,
  },
  {
    id: 5,
    title: "Pigs Can Fly",
    image: "/images/game_5.jpeg",
    price: "0.8 SUI",
    tags: ["Casual", "Platformer"],
    rating: 4.9,
  },
  {
    id: 6,
    title: "Ghost Mansion",
    image: "/images/game_6.jpeg",
    price: "0.55 SUI",
    tags: ["Horror", "Action"],
    rating: 4.6,
  },
];

export function HomePage() {
  const currentAccount = useCurrentAccount();
  const [selectedCategory, setSelectedCategory] = useState("new");
  const [counterId, setCounter] = useState(() => {
    const hash = window.location.hash.slice(1);
    return isValidSuiObjectId(hash) ? hash : null;
  });

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#1a1a1a] text-white">
      {/* Hero Section */}
      <div className="relative h-[500px] w-full">
        <div className="absolute inset-0">
          <img
            src="/images/game_1.jpeg"
            alt="Featured Game"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
        </div>
        <div className="absolute bottom-4 left-0 right-0 p-8 max-w-7xl mx-auto flex flex-col gap-y-4">
          <h1 className="text-5xl font-bold mb-4">{featuredGames[0].title}</h1>
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
            {popularGames.map((game) => (
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
