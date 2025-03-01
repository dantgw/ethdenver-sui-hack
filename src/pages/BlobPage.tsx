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

export function BlobPage() {
  const { blobId } = useParams();
  const [blobContent, setBlobContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnityGame, setIsUnityGame] = useState(false);

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

  // Add this function near the top of the component
  const unityShowBanner = (msg: string, type: "error" | "warning") => {
    const warningBanner = document.querySelector("#unity-warning");
    if (!warningBanner) return;

    const updateBannerVisibility = () => {
      warningBanner.style.display = warningBanner.children.length
        ? "block"
        : "none";
    };

    const div = document.createElement("div");
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

  // Update the loadUnityGame function to match the working pattern
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
      productName: "Unity Game",
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

        try {
          // Try to unzip the content
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(blob);

          // Debug logging to see zip contents
          console.log("Zip contents:", Object.keys(zipContent.files));

          // Check if this is a Unity game by looking for key files
          const hasUnityLoader = zipContent.file(/Build\.loader\.js$/);
          console.log("Unity loader files:", hasUnityLoader);
          const hasUnityData = zipContent.file(/Build\.data(\.gz)?$/);
          console.log("Unity data files:", hasUnityData);
          const hasUnityFramework = zipContent.file(
            /Build\.framework\.js(\.gz)?$/,
          );
          console.log("Unity framework files:", hasUnityFramework);
          const hasUnityWasm = zipContent.file(/Build\.wasm(\.gz)?$/);
          console.log("Unity wasm files:", hasUnityWasm);

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
                // Store URL with the exact file path
                fileUrls.set(file.path, url);
                console.log(`Stored URL for ${file.path}:`, url); // Debug log
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
        console.error("Error fetching blob:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch blob content",
        );
      } finally {
        setLoading(false);
      }
    };

    const cleanup = fetchBlobContent();
    return () => {
      cleanup?.then((cleanupFn) => cleanupFn?.());
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

          {blobContent && !loading && !error && !isUnityGame && (
            <div className="overflow-auto">
              <img
                src={blobContent}
                alt="Blob content"
                className="max-w-full rounded-lg"
              />
            </div>
          )}

          {isUnityGame && !loading && !error && (
            <div id="unity-container" className="unity-desktop">
              <canvas
                id="unity-canvas"
                width={960}
                height={720}
                tabIndex={-1}
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
                <div id="unity-build-title">Unity Game</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
