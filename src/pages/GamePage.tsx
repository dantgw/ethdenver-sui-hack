import { useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
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

export function GamePage() {
  const { gameId } = useParams();
  const suiClient = useSuiClient();
  const [blobContent, setBlobContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnityGame, setIsUnityGame] = useState(false);
  const [gameTitle, setGameTitle] = useState("Unity Game");

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
    // <div className="flex flex-col items-center w-full">
    //   <div className="flex flex-col items-center w-full max-w-[960px] ">
    //     <motion.div
    //       initial={{ opacity: 0, y: 20 }}
    //       animate={{ opacity: 1, y: 0 }}
    //       transition={{ duration: 0.3 }}
    //       className="w-full"
    //     >
    //       <div className="w-full bg-[#252525] min-h-[720px] flex items-center justify-center">
    //         {loading && !isUnityGame && <GameSkeleton />}

    //         {error && (
    //           <div className="text-red-500 p-4 bg-red-500/10 rounded-lg">
    //             <p className="font-semibold">Error</p>
    //             <p className="text-sm opacity-90">{error}</p>
    //           </div>
    //         )}

    //         {blobContent && !loading && !error && !isUnityGame && (
    //           <div className="w-full overflow-hidden rounded-lg">
    //             <img
    //               src={blobContent}
    //               alt="Game content"
    //               className="w-full h-auto rounded-lg"
    //             />
    //           </div>
    //         )}

    //         {isUnityGame && !loading && !error && (
    //           <div id="unity-container" className=" flex justify-center w-full">
    //             <div className="relative">
    //               <canvas
    //                 id="unity-canvas"
    //                 width={960}
    //                 height={480}
    //                 tabIndex={-1}
    //                 className=""
    //                 // style={{ width: "960px", height: "720px" }}
    //               ></canvas>
    //               <div id="unity-loading-bar">
    //                 <div id="unity-logo"></div>
    //                 <div id="unity-progress-bar-empty">
    //                   <div id="unity-progress-bar-full"></div>
    //                 </div>
    //               </div>
    //               <div id="unity-warning"> </div>
    //               <div id="unity-footer">
    //                 <div id="unity-logo-title-footer"></div>
    //                 <div id="unity-fullscreen-button"></div>
    //               </div>
    //             </div>
    //           </div>
    //         )}
    //       </div>
    //       <h1 className="text-2xl font-bold mb-6 text-center">{gameTitle}</h1>
    //     </motion.div>
    //   </div>
    // </div>
    <div className="flex flex-col items-center w-full gap-y-4">
      <div className="flex flex-col items-center w-full max-w-[960px]">
        <div id="unity-container" className="flex  w-full">
          <div className="relative ">
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
      <div className="bg-blue-500 max-w-[960px] w-full">asdf</div>
    </div>
  );
}
