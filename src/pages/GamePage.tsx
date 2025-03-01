import { GAME_STORE_ID } from "@/constants";
import { useNetworkVariable } from "@/networkConfig";
import {
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import JSZip from "jszip";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type UnityInstance = {
  SetFullscreen: (value: number) => void;
};

type UnityFile = {
  path: string;
  contentType: string;
};

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
}

// Skeleton loader component
const GameSkeleton = () => (
  <div className="animate-pulse w-full">
    <img src={"/animations/loading.gif"} />
  </div>
);

// Add this helper function near the top of the file
const formatSuiPrice = (mist: string): string => {
  const sui = Number(mist) / 1000000000;
  return `${sui.toFixed(2)} SUI`;
};

// Add this helper function to format addresses
const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function GamePage() {
  const { gameId } = useParams();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const gameStorePackageId = useNetworkVariable("gameStorePackageId");
  const [blobContent, setBlobContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnityGame, setIsUnityGame] = useState(false);
  const [gameTitle, setGameTitle] = useState("Unity Game");
  const [purchasing, setPurchasing] = useState(false);

  // Query the game object to get its details
  const { data: gameObject } = useSuiClientQuery("getObject", {
    id: gameId || "",
    options: {
      showContent: true,
      showOwner: true,
    },
  });

  // Helper function to get content type based on file extension
  const getContentType = (path: string): string => {
    if (path.endsWith(".js")) return "application/javascript";
    if (path.endsWith(".wasm")) return "application/wasm";
    if (path.endsWith(".data")) return "application/octet-stream";
    if (path.endsWith(".js.br")) return "application/javascript; encoding=br";
    if (path.endsWith(".wasm.br")) return "application/wasm; encoding=br";
    if (path.endsWith(".data.br"))
      return "application/octet-stream; encoding=br";
    if (path.endsWith(".js.gz")) return "application/javascript; encoding=gzip";
    if (path.endsWith(".wasm.gz")) return "application/wasm; encoding=gzip";
    if (path.endsWith(".data.gz"))
      return "application/octet-stream; encoding=gzip";
    return "application/octet-stream";
  };

  // Helper function to create blob URL with proper content type
  const createBlobUrl = async (
    zipFile: JSZip.JSZipObject,
    contentType: string,
  ): Promise<string> => {
    const content = await zipFile.async("blob");
    const blob = new Blob([content], { type: contentType });
    return URL.createObjectURL(blob);
  };

  // Unity warning banner function
  const unityShowBanner = (msg: string, type: "error" | "warning") => {
    const warningBanner = document.querySelector(
      "#unity-warning",
    ) as HTMLDivElement;
    if (!warningBanner) return;

    const updateBannerVisibility = () => {
      warningBanner.style.display = warningBanner.children.length
        ? "block"
        : "none";
    };

    const div = document.createElement("div") as HTMLDivElement;
    div.innerHTML = msg;
    warningBanner.appendChild(div);

    if (type === "error") {
      div.style.cssText = "background: red; padding: 10px;";
    } else {
      div.style.cssText = "background: yellow; padding: 10px;";
      setTimeout(() => {
        warningBanner.removeChild(div);
        updateBannerVisibility();
      }, 5000);
    }
    updateBannerVisibility();
  };

  // Load Unity game function
  const loadUnityGame = (
    fileUrls: Map<string, string>,
    hasUnityLoader: JSZip.JSZipObject[],
    hasUnityData: JSZip.JSZipObject[],
    hasUnityFramework: JSZip.JSZipObject[],
    hasUnityWasm: JSZip.JSZipObject[],
  ) => {
    const config = {
      dataUrl: fileUrls.get(hasUnityData[0].name),
      frameworkUrl: fileUrls.get(hasUnityFramework[0].name),
      codeUrl: fileUrls.get(hasUnityWasm[0].name),
      streamingAssetsUrl: "StreamingAssets",
      companyName: "DefaultCompany",
      productName: gameTitle,
      productVersion: "1.0",
    };

    console.log("Unity config:", config);

    // First load the framework
    const frameworkScript = document.createElement("script");
    frameworkScript.src = fileUrls.get(hasUnityFramework[0].name)!;
    frameworkScript.onload = () => {
      // Then load the loader script
      const loaderScript = document.createElement("script");
      loaderScript.src = fileUrls.get(hasUnityLoader[0].name)!;
      loaderScript.onload = () => {
        const canvas = document.querySelector(
          "#unity-canvas",
        ) as HTMLCanvasElement;
        const loadingBar = document.querySelector(
          "#unity-loading-bar",
        ) as HTMLDivElement;
        const progressBarFull = document.querySelector(
          "#unity-progress-bar-full",
        ) as HTMLDivElement;
        const fullscreenButton = document.querySelector(
          "#unity-fullscreen-button",
        ) as HTMLDivElement;

        if (loadingBar) {
          loadingBar.style.display = "block";
        }

        // @ts-ignore
        createUnityInstance(canvas, config, (progress: number) => {
          if (progressBarFull) {
            progressBarFull.style.width = `${100 * progress}%`;
          }
        })
          .then((unityInstance: UnityInstance) => {
            if (loadingBar) {
              loadingBar.style.display = "none";
            }
            if (fullscreenButton) {
              fullscreenButton.onclick = () => {
                unityInstance.SetFullscreen(1);
              };
            }
          })
          .catch((message: string) => {
            console.error("Unity initialization error:", message);
            setError(`Unity initialization error: ${message}`);
          });
      };

      document.body.appendChild(loaderScript);
    };

    document.body.appendChild(frameworkScript);

    // Return cleanup function
    return () => {
      if (frameworkScript.parentNode) {
        frameworkScript.parentNode.removeChild(frameworkScript);
      }
    };
  };

  // Add a function to safely get game fields
  const getGameFields = (): SuiGameFields | null => {
    if (!gameObject?.data?.content) return null;
    const gameData = gameObject.data.content as any;
    return gameData?.fields?.value?.fields as SuiGameFields;
  };

  const handlePurchase = async () => {
    const gameFields = getGameFields();
    if (!gameFields?.price) {
      console.error("No price found for game");
      return;
    }

    setPurchasing(true);
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${gameStorePackageId}::store::purchase_game`,
        arguments: [
          tx.object(GAME_STORE_ID),
          tx.pure("u64", BigInt(gameFields.game_id)),
          tx.gas, // Use the gas object directly as payment
        ],
      });

      signAndExecute(
        {
          transaction: tx,
          options: {
            showEffects: true,
            showObjectChanges: true,
            gasBudget: BigInt(gameFields.price) + BigInt(1000000), // Add some extra for gas
          },
        },
        {
          onSuccess: (result) => {
            suiClient.waitForTransaction({ digest: result.digest }).then(() => {
              console.log("Game purchased successfully!");
            });
          },
          onError: (error) => {
            console.error("Purchase failed:", error);
            setError("Failed to purchase game");
          },
        },
      );
    } catch (err) {
      console.error("Purchase error:", err);
      setError(err instanceof Error ? err.message : "Failed to purchase game");
    } finally {
      setPurchasing(false);
    }
  };

  useEffect(() => {
    console.log("gameObject", gameObject);
    const fetchGameContent = async () => {
      if (!gameId || !gameObject?.data?.content) return;

      try {
        setLoading(true);
        // Extract game details from the game object
        const gameData = gameObject.data.content as any;
        const gameFields = gameData?.fields?.value?.fields as SuiGameFields;

        if (!gameFields) {
          throw new Error("Invalid game data structure");
        }

        setGameTitle(gameFields.title);
        const blobId = gameFields.current_content_blob_id;

        const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";
        const response = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the blob data
        const blob = await response.blob();

        try {
          // Try to unzip the content
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(blob);

          // Debug logging to see zip contents
          console.log("Zip contents:", Object.keys(zipContent.files));

          // Check if this is a Unity game by looking for key files
          const hasUnityLoader = zipContent.file(/Build\.loader\.js$/);
          const hasUnityData = zipContent.file(/Build\.data(\.gz)?$/);
          const hasUnityFramework = zipContent.file(
            /Build\.framework\.js(\.gz)?$/,
          );
          const hasUnityWasm = zipContent.file(/Build\.wasm(\.gz)?$/);

          if (
            hasUnityLoader &&
            hasUnityData &&
            hasUnityFramework &&
            hasUnityWasm
          ) {
            setIsUnityGame(true);

            // Map to store file URLs
            const fileUrls = new Map<string, string>();

            // Identify all Unity files and their properties
            const unityFiles: UnityFile[] = [
              {
                path: hasUnityLoader[0].name,
                contentType: getContentType(hasUnityLoader[0].name),
              },
              {
                path: hasUnityData[0].name,
                contentType: getContentType(hasUnityData[0].name),
              },
              {
                path: hasUnityFramework[0].name,
                contentType: getContentType(hasUnityFramework[0].name),
              },
              {
                path: hasUnityWasm[0].name,
                contentType: getContentType(hasUnityWasm[0].name),
              },
            ];

            // Process all Unity files
            await Promise.all(
              unityFiles.map(async (file) => {
                const zipFile = zipContent.files[file.path];
                const url = await createBlobUrl(zipFile, file.contentType);
                fileUrls.set(file.path, url);
              }),
            );

            // Only load the Unity game after all files are successfully downloaded
            setBlobContent("unity");
            const cleanupUnity = loadUnityGame(
              fileUrls,
              hasUnityLoader,
              hasUnityData,
              hasUnityFramework,
              hasUnityWasm,
            );

            // Return combined cleanup function
            return () => {
              cleanupUnity?.();
              fileUrls.forEach((url) => URL.revokeObjectURL(url));
            };
          } else {
            // Not a Unity game, treat as image
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result as string;
              setBlobContent(base64data);
            };
            reader.onerror = () => {
              setError("Failed to convert blob to data URL");
            };
            reader.readAsDataURL(blob);
          }
        } catch (zipError) {
          console.error("Zip error:", zipError);
          // Not a zip file, treat as image
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            setBlobContent(base64data);
          };
          reader.onerror = () => {
            setError("Failed to convert blob to data URL");
          };
          reader.readAsDataURL(blob);
        }
      } catch (err) {
        console.error("Error fetching game:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch game content",
        );
      } finally {
        setLoading(false);
      }
    };

    const cleanup = fetchGameContent();
    return () => {
      cleanup?.then((cleanupFn) => cleanupFn?.());
    };
  }, [gameId, gameObject]);

  return (
    <div className="flex flex-col items-center w-full gap-y-4 pb-12">
      <div className="flex flex-col items-center w-full max-w-[960px]">
        <div id="unity-container" className="flex w-full">
          <div className="relative">
            <canvas
              id="unity-canvas"
              width={1920}
              height={1080}
              tabIndex={-1}
              className=""
            ></canvas>
            <div id="unity-loading-bar">
              <div id="unity-logo"></div>
              <div id="unity-progress-bar-empty">
                <div id="unity-progress-bar-full"></div>
              </div>
            </div>
            <div id="unity-warning"> </div>
            <div id="unity-footer">
              <div id="unity-logo-title-footer"></div>
              <div id="unity-fullscreen-button"></div>
            </div>
          </div>
        </div>
      </div>

      {getGameFields() && (
        <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-[960px] w-full">
          <div className="grid gap-6">
            <div className="border-b border-gray-700 pb-4 gap-y-4 flex flex-col">
              <div className="flex flex-row justify-between align-middle">
                <span className="text-3xl font-bold">
                  {getGameFields()?.title}
                </span>
                <button
                  className="px-4 py-2 bg-[#8A2BE2] text-white rounded-full hover:bg-[#9B4AE6] transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  onClick={handlePurchase}
                  disabled={purchasing || !getGameFields()?.price}
                >
                  <span className="font-medium">
                    {purchasing ? (
                      <div className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5 text-white"
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
                        Processing...
                      </div>
                    ) : (
                      "Support"
                    )}
                  </span>
                </button>
              </div>
              <p className="text-gray-400">{getGameFields()?.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-gray-400">Developer</p>
                <p className="text-white font-mono">
                  {formatAddress(getGameFields()?.developer || "")}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-400">Price</p>
                <p className="text-white font-bold">
                  {formatSuiPrice(getGameFields()?.price || "0")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-gray-400">Game ID</p>
                <p className="text-white font-mono">
                  {getGameFields()?.game_id}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-400">Version</p>
                <p className="text-white">{getGameFields()?.current_version}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
