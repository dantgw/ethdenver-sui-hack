import { useCurrentAccount } from "@mysten/dapp-kit";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { useState } from "react";
import { Counter } from "../Counter";
import { CreateCounter } from "../CreateCounter";

export function CounterPage() {
  const currentAccount = useCurrentAccount();
  const [counterId, setCounter] = useState(() => {
    const hash = window.location.hash.slice(1);
    return isValidSuiObjectId(hash) ? hash : null;
  });

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col items-center w-full max-w-[960px]">
        <div className="rounded-lg shadow p-6">
          {currentAccount ? (
            counterId ? (
              <Counter id={counterId} />
            ) : (
              <CreateCounter
                onCreated={(id) => {
                  window.location.hash = id;
                  setCounter(id);
                }}
              />
            )
          ) : (
            <h1 className="text-2xl font-bold text-white">
              Please connect your wallet
            </h1>
          )}
        </div>
      </div>
    </div>
  );
}
