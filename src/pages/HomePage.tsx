import { useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { useState } from "react";

// Add mock data for demonstration - replace with your actual data
const galleryItems = [
  {
    id: 1,
    title: "game 3",
    image: "/images/game_3.jpeg",
    size: "large", // Controls the size of the card
  },
  {
    id: 2,
    title: "Game 4",
    image: "/images/game_4.jpeg",
    size: "small",
  },
  // Add more items as needed
];

export function HomePage() {
  const currentAccount = useCurrentAccount();
  const [counterId, setCounter] = useState(() => {
    const hash = window.location.hash.slice(1);
    return isValidSuiObjectId(hash) ? hash : null;
  });

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="flex flex-col items-center justify-center w-full max-w-[960px]">
        {/* Gallery Grid Container */}
        <div className="grid grid-cols-4 gap-4  w-full">
          {/* Featured Large Item */}
          <div className="col-span-2 row-span-2 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="relative aspect-[16/9]">
              <img
                src="/images/game_1.jpeg"
                alt="Featured"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <h3 className="text-white text-xl font-bold">Featured Title</h3>
              </div>
            </div>
          </div>

          {/* Regular Items */}
          {galleryItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 
                ${item.size === "large" ? "col-span-2 row-span-2" : "col-span-1 row-span-1"}`}
            >
              <div
                className={`relative ${item.size === "large" ? "aspect-[16/9]" : "aspect-[4/3]"}`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <h3 className="text-white text-sm font-semibold">
                    {item.title}
                  </h3>
                </div>
              </div>
            </div>
          ))}

          {/* Promotional Banner */}
          <div className="col-span-4 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="relative aspect-[21/9]">
              <img
                src="/images/game_2.jpeg"
                alt="Promotional Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <h2 className="text-white text-2xl font-bold">
                  Special Promotion
                </h2>
                <p className="text-white/90">Check out our latest offerings!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
