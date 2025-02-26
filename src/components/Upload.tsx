import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState } from "react";

export function Upload() {
  const currentAccount = useCurrentAccount();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentAccount) return;

    setUploading(true);
    try {
      // TODO: Implement actual file upload logic here
      console.log("Uploading file:", selectedFile.name);

      // Reset after upload
      setSelectedFile(null);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="text-center text-white">
        <h1 className="text-2xl font-bold">Please connect your wallet</h1>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-[#303030] rounded-lg p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Upload File</h1>

      <div className="space-y-4">
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-[#252525] hover:bg-[#2a2a2a] transition-colors"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="w-10 h-10 mb-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                ></path>
              </svg>
              <p className="mb-2 text-sm text-gray-400">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-400">
                Any file type (MAX. 100MB)
              </p>
            </div>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </div>

        {selectedFile && (
          <div className="flex items-center justify-between bg-[#252525] p-4 rounded-lg">
            <span className="text-sm text-gray-300">{selectedFile.name}</span>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-red-500 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className={`w-full py-2 px-4 rounded-lg font-medium ${
            !selectedFile || uploading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } transition-colors`}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
}
