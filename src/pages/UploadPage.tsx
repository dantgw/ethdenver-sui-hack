import { GAME_STORE_ID } from "@/constants";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { motion } from "framer-motion";
import JSZip from "jszip";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNetworkVariable } from "../networkConfig";

// Add WebkitDirectoryAttribute to HTMLInputElement
declare module "react" {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    directory?: string;
    webkitdirectory?: string;
  }
}

const UploadStep = ({
  number,
  title,
  isActive,
  isCompleted,
}: {
  number: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
}) => (
  <div className="flex items-center">
    <div
      className={`flex items-center justify-center w-8 h-8 rounded-full ${
        isCompleted ? "bg-green-500" : isActive ? "bg-blue-600" : "bg-gray-600"
      }`}
    >
      {isCompleted ? (
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <span className="text-white">{number}</span>
      )}
    </div>
    <div className="ml-3">
      <p
        className={`text-sm font-medium ${isActive ? "text-white" : "text-gray-400"}`}
      >
        {title}
      </p>
    </div>
  </div>
);

export function UploadPage() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const gameStorePackageId = useNetworkVariable("gameStorePackageId");
  const [blobId, setBlobId] = useState<string | null>(null);
  const navigate = useNavigate();

  const [selectedCoverImage, setSelectedCoverImage] = useState<File | null>(
    null,
  );
  const [selectedGameContent, setSelectedGameContent] =
    useState<FileList | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
  });
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: "cover" | "content",
  ) => {
    const files = event.target.files;
    if (files) {
      if (fileType === "cover") {
        setSelectedCoverImage(files[0]);
      } else {
        setSelectedGameContent(files);
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

      const zip = new JSZip();
      const gameFiles = Array.from(selectedGameContent);

      for (const file of gameFiles) {
        const relativePath = file.webkitRelativePath || file.name;
        const fileData = await file.arrayBuffer();
        zip.file(relativePath, fileData);
      }

      const gameZipBlob = await zip.generateAsync({ type: "blob" });

      const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
      const address = currentAccount.address;

      const coverImageResponse = await fetch(coverImageData);
      const coverImageBlob = await coverImageResponse.blob();
      const coverImageUrl = `${PUBLISHER}/v1/blobs?send_object_to=${address}`;
      const coverImageWalrusResponse = await fetch(coverImageUrl, {
        method: "PUT",
        body: coverImageBlob,
      });
      const coverImageResult = await coverImageWalrusResponse.json();

      const gameContentUrl = `${PUBLISHER}/v1/blobs?send_object_to=${address}`;
      const gameContentWalrusResponse = await fetch(gameContentUrl, {
        method: "PUT",
        body: gameZipBlob,
      });
      const gameContentResult = await gameContentWalrusResponse.json();

      // Extract blob IDs from either response format
      const getBlobIdFromResult = (result: any) => {
        if (result.alreadyCertified) {
          return result.alreadyCertified.blobId;
        }
        if (result.newlyCreated) {
          return result.newlyCreated.blobObject.blobId;
        }
        return null;
      };

      const coverImageBlobId = getBlobIdFromResult(coverImageResult);
      const contentBlobId = getBlobIdFromResult(gameContentResult);

      if (!coverImageBlobId || !contentBlobId) {
        throw new Error("Failed to get blob IDs from response");
      }

      console.log("Form data:", formData);
      console.log("Cover image upload result:", coverImageResult);
      console.log("Game content upload result:", gameContentResult);

      // Create transaction to list game
      const tx = new Transaction();
      const price = formData.price
        ? BigInt(parseFloat(formData.price) * 1e9)
        : null;

      // Encode arguments as bytes
      const titleBytes = bcs.string().serialize(formData.title);
      const descriptionBytes = bcs.string().serialize(formData.description);
      const coverImageBytes = bcs.string().serialize(coverImageBlobId);
      const contentBlobBytes = bcs.string().serialize(contentBlobId);
      const priceOption = bcs.option(bcs.U64).serialize(price);

      tx.moveCall({
        target: `${gameStorePackageId}::store::list_game`,
        arguments: [
          tx.object(GAME_STORE_ID),
          tx.pure(titleBytes),
          tx.pure(descriptionBytes),
          tx.pure(coverImageBytes),
          tx.pure(contentBlobBytes),
          tx.pure(priceOption),
        ],
      });

      // Execute the transaction
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            suiClient.waitForTransaction({ digest: result.digest }).then(() => {
              // Navigate to the blob page using the game content blob ID
              if (contentBlobId) {
                navigate(`/blob/${contentBlobId}`);
              }

              // Reset form after successful upload
              setSelectedCoverImage(null);
              setSelectedGameContent(null);
              setFormData({ title: "", description: "", price: "" });
            });
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
          },
        },
      );
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
    <div className="flex flex-col items-center w-screen h-full min-h-screen bg-[#0F0F0F]">
      <div className="w-full max-w-5xl px-8 py-12 flex flex-col gap-y-12">
        <h1 className="text-4xl font-bold mb-12 text-white w-full">
          Upload Your Game
        </h1>

        <div className="flex flex-col gap-y-6">
          {/* Title Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col gap-y-2"
          >
            <label
              htmlFor="title"
              className="block text-base font-medium text-gray-200 mb-3"
            >
              Game Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-5 py-4 bg-[#1A1A1A] border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
              placeholder="Enter an engaging title for your game"
            />
          </motion.div>

          {/* Description Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full flex flex-col gap-y-2"
          >
            <label
              htmlFor="description"
              className="block text-base font-medium text-gray-200 mb-3"
            >
              Game Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-5 py-4 bg-[#1A1A1A] border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 min-h-[160px] resize-none"
              placeholder="Describe your game and what makes it special..."
            />
          </motion.div>

          {/* Cover Image Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="w-full flex flex-col gap-y-2"
          >
            <label className="block text-base font-medium text-gray-200 mb-3">
              Cover Image
            </label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="cover-upload"
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedCoverImage
                    ? "border-green-500 bg-[#1A1A1A]/80"
                    : "border-gray-600 bg-[#1A1A1A] hover:bg-[#252525]"
                }`}
              >
                {selectedCoverImage ? (
                  <div className="flex flex-col items-center">
                    <svg
                      className="w-10 h-10 text-green-500 mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="text-sm text-green-500">
                      {selectedCoverImage.name}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-10 h-10 text-gray-400 mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-400">
                      <span className="font-semibold">
                        Click to upload cover image
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
                  </div>
                )}
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "cover")}
                />
              </label>
            </div>
          </motion.div>

          {/* Game Content Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="w-full flex flex-col gap-y-2"
          >
            <label className="block text-base font-medium text-gray-200 mb-3">
              Game Content
            </label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="game-upload"
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedGameContent
                    ? "border-green-500 bg-[#1A1A1A]/80"
                    : "border-gray-600 bg-[#1A1A1A] hover:bg-[#252525]"
                }`}
              >
                {selectedGameContent ? (
                  <div className="flex flex-col items-center">
                    <svg
                      className="w-10 h-10 text-green-500 mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="text-sm text-green-500">
                      {selectedGameContent.length} files selected
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-10 h-10 text-gray-400 mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-400">
                      <span className="font-semibold">
                        Click to upload Unity build folder
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Select your Unity build folder
                    </p>
                  </div>
                )}
                <input
                  id="game-upload"
                  type="file"
                  webkitdirectory="true"
                  directory=""
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "content")}
                />
              </label>
            </div>
          </motion.div>

          {/* Price Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="w-full flex flex-col gap-y-2"
          >
            <label
              htmlFor="price"
              className="block text-base font-medium text-gray-200 mb-3"
            >
              Price (SUI)
            </label>
            <div className="relative">
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full pl-14 pr-5 py-4 bg-[#1A1A1A] border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-5">
                <span className="text-gray-400 text-lg">SUI</span>
              </div>
            </div>
          </motion.div>

          {/* Upload Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="pt-6"
          >
            <button
              onClick={handleUpload}
              disabled={
                !selectedGameContent ||
                !selectedCoverImage ||
                uploading ||
                !formData.title ||
                !formData.price
              }
              className={`w-full py-5 px-8 rounded-lg font-medium text-lg transition-all duration-200 ${
                !selectedGameContent ||
                !selectedCoverImage ||
                uploading ||
                !formData.title ||
                !formData.price
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-[#9B4AE6] hover:bg-[#A366E8] transform hover:-translate-y-1 cursor-pointer font-bold"
              }`}
            >
              {uploading ? (
                <div className="flex flex-row gap-x-2 items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="font-bold">Uploading Game...</span>
                </div>
              ) : (
                <span className="font-bold">List Game</span>
              )}
            </button>
          </motion.div>

          {uploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full bg-[#1A1A1A] rounded-full h-3 mt-6"
            >
              <motion.div
                className="bg-blue-600 h-3 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.5 }}
              ></motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
