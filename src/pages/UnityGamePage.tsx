import { useEffect } from "react";
import "./UnityGame.css"; // We'll create this next

type UnityInstance = {
  SetFullscreen: (value: number) => void;
};

export function UnityGamePage() {
  useEffect(() => {
    const container = document.querySelector("#unity-container");
    const canvas = document.querySelector("#unity-canvas") as HTMLCanvasElement;
    const loadingBar = document.querySelector(
      "#unity-loading-bar",
    ) as HTMLDivElement;
    const progressBarFull = document.querySelector(
      "#unity-progress-bar-full",
    ) as HTMLDivElement;
    const fullscreenButton = document.querySelector(
      "#unity-fullscreen-button",
    ) as HTMLDivElement;

    const buildUrl = "/game/Build";
    const loaderUrl = buildUrl + "/Build.loader.js";
    const config = {
      dataUrl: buildUrl + "/Build.data.br",
      frameworkUrl: buildUrl + "/Build.framework.js.br",
      codeUrl: buildUrl + "/Build.wasm.br",
      streamingAssetsUrl: "StreamingAssets",
      companyName: "DefaultCompany",
      productName: "Flappy Bird",
      productVersion: "1.0.2",
    };

    // Load Unity
    const script = document.createElement("script");
    script.src = loaderUrl;
    script.onload = () => {
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
          alert(message);
        });
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col items-center w-full max-w-[960px]">
        <div id="unity-container" className="flex justify-center w-full">
          <div className="relative">
            <canvas
              id="unity-canvas"
              width={960}
              height={720}
              tabIndex={-1}
              className=""
              style={{ width: "960px", height: "720px" }}
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
    </div>
  );
}
