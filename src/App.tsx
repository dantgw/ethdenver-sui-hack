import { useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { BlobPage } from "./pages/BlobPage";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { UnityGamePage } from "./pages/UnityGamePage";
import { UploadPage } from "./pages/UploadPage";

function App() {
  const currentAccount = useCurrentAccount();
  const [counterId, setCounter] = useState(() => {
    const hash = window.location.hash.slice(1);
    return isValidSuiObjectId(hash) ? hash : null;
  });
  const [currentPage, setCurrentPage] = useState("counter");

  // const renderContent = () => {
  //   if (currentPage === "upload") {
  //     return <Upload />;
  //   }

  //   return (
  //     <div className="rounded-lg shadow p-6">
  //       {currentAccount ? (
  //         counterId ? (
  //           <Counter id={counterId} />
  //         ) : (
  //           <CreateCounter
  //             onCreated={(id) => {
  //               window.location.hash = id;
  //               setCounter(id);
  //             }}
  //           />
  //         )
  //       ) : (
  //         <h1 className="text-2xl font-bold text-white">
  //           Please connect your wallet
  //         </h1>
  //       )}
  //     </div>
  //   );
  // };

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/blob/:blobId" element={<BlobPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/unitygame" element={<UnityGamePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
