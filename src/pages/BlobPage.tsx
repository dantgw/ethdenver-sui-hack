import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export function BlobPage() {
  const { blobId } = useParams();
  const [blobContent, setBlobContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlobContent = async () => {
      if (!blobId) return;

      try {
        setLoading(true);
        const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";
        const response = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the blob data
        const blob = await response.blob();

        // Convert blob to data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setBlobContent(base64data);
        };
        reader.onerror = () => {
          setError("Failed to convert blob to data URL");
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error("Error fetching blob:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch blob content",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBlobContent();

    // Cleanup function
    return () => {
      if (blobContent?.startsWith("blob:")) {
        URL.revokeObjectURL(blobContent);
      }
    };
  }, [blobId]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col items-center w-full max-w-[960px]">
        <h1 className="text-2xl font-bold mb-6">Blob Details</h1>

        <div className="w-full p-6 bg-[#252525] rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Blob ID</h2>
          <p className="text-gray-300 break-all mb-6">{blobId}</p>

          <h2 className="text-xl font-semibold mb-4">Content</h2>
          {loading && <div className="text-gray-300">Loading...</div>}

          {error && <div className="text-red-500">Error: {error}</div>}

          {blobContent && !loading && !error && (
            <div className="overflow-auto">
              <img
                src={blobContent}
                alt="Blob content"
                className="max-w-full rounded-lg"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
