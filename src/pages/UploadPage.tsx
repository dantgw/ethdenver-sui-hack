import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState } from "react";

export function UploadPage() {
  const currentAccount = useCurrentAccount();
  const [blobId, setBlobId] = useState<string | null>(null);

  const [selectedCoverImage, setSelectedCoverImage] = useState<File | null>(
    null,
  );
  const [selectedGameContent, setSelectedGameContent] = useState<File | null>(
    null,
  );
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
  });
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: "cover" | "content",
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (fileType === "cover") {
        setSelectedCoverImage(file);
      } else {
        setSelectedGameContent(file);
      }
    }
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpload = async () => {
    if (!selectedGameContent || !selectedCoverImage || !currentAccount) return;

    setUploading(true);
    try {
      // Upload cover image to Walrus
      const coverImageReader = new FileReader();
      const coverImagePromise = new Promise((resolve, reject) => {
        coverImageReader.onload = () => resolve(coverImageReader.result);
        coverImageReader.onerror = reject;
      });
      coverImageReader.readAsDataURL(selectedCoverImage);
      const coverImageData = (await coverImagePromise) as string;

      // Upload game content to Walrus
      const gameContentReader = new FileReader();
      const gameContentPromise = new Promise((resolve, reject) => {
        gameContentReader.onload = () => resolve(gameContentReader.result);
        gameContentReader.onerror = reject;
      });
      gameContentReader.readAsDataURL(selectedGameContent);
      const gameContentData = (await gameContentPromise) as string;

      const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
      const address = currentAccount.address;

      // Upload cover image
      const coverImageResponse = await fetch(coverImageData);
      const coverImageBlob = await coverImageResponse.blob();
      const coverImageUrl = `${PUBLISHER}/v1/blobs?send_object_to=${address}`;
      const coverImageWalrusResponse = await fetch(coverImageUrl, {
        method: "PUT",
        body: coverImageBlob,
      });
      const coverImageResult = await coverImageWalrusResponse.json();

      // Upload game content
      const gameContentResponse = await fetch(gameContentData);
      const gameContentBlob = await gameContentResponse.blob();
      const gameContentUrl = `${PUBLISHER}/v1/blobs?send_object_to=${address}`;
      const gameContentWalrusResponse = await fetch(gameContentUrl, {
        method: "PUT",
        body: gameContentBlob,
      });
      const gameContentResult = await gameContentWalrusResponse.json();

      console.log("Form data:", formData);
      console.log("Cover image upload result:", coverImageResult);
      console.log("Game content upload result:", gameContentResult);

      // Reset form after successful upload
      setSelectedCoverImage(null);
      setSelectedGameContent(null);
      setFormData({ title: "", description: "", price: "" });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold">Please connect your wallet</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col items-center w-full max-w-[960px]">
        <h1 className="text-2xl font-bold mb-6">Upload Game</h1>

        <div className="space-y-4 w-full">
          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-[#252525] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter game title"
            />
          </div>

          {/* Description Input */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-[#252525] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="Enter game description"
            />
          </div>

          {/* Cover Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Cover Image
            </label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="cover-upload"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-[#252525] hover:bg-[#2a2a2a] transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <p className="mb-2 text-sm text-gray-400">
                    <span className="font-semibold">
                      Click to upload cover image
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
                </div>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "cover")}
                />
              </label>
            </div>
            {selectedCoverImage && (
              <div className="mt-2 flex items-center justify-between bg-[#252525] p-4 rounded-lg">
                <span className="text-sm text-gray-300">
                  {selectedCoverImage.name}
                </span>
                <button
                  onClick={() => setSelectedCoverImage(null)}
                  className="text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Game Content Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Game Content
            </label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="game-upload"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-[#252525] hover:bg-[#2a2a2a] transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <p className="mb-2 text-sm text-gray-400">
                    <span className="font-semibold">
                      Click to upload game content
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Any file type up to 100MB
                  </p>
                </div>
                <input
                  id="game-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "content")}
                />
              </label>
            </div>
            {selectedGameContent && (
              <div className="mt-2 flex items-center justify-between bg-[#252525] p-4 rounded-lg">
                <span className="text-sm text-gray-300">
                  {selectedGameContent.name}
                </span>
                <button
                  onClick={() => setSelectedGameContent(null)}
                  className="text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Price Input */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium mb-2">
              Price (SUI)
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-[#252525] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter price in SUI"
              min="0"
              step="0.01"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={
              !selectedGameContent ||
              !selectedCoverImage ||
              uploading ||
              !formData.title ||
              !formData.price
            }
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              !selectedGameContent ||
              !selectedCoverImage ||
              uploading ||
              !formData.title ||
              !formData.price
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } transition-colors`}
          >
            {uploading ? "Uploading..." : "Upload Game"}
          </button>
        </div>
      </div>
    </div>
  );
}
