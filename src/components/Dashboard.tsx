"use client";

import React, { useEffect, useState } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";

interface Balance {
  contract_address: string;
  contract_ticker_symbol: string;
  contract_decimals: number;
  balance: number;
}

interface Transactions {
  tx_hash: string;
  block_signed_at: string;
  token_symbol: string;
  value: number;
}

function DashboardContent() {
  const { login, logout, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets?.[0]?.address || "";

  const [balances, setBalances] = useState<Balance[]>([]);
  const [txs, setTxs] = useState<Transactions[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);

    const chainId = process.env.NEXT_PUBLIC_SONIC_CHAIN_ID || "14601";
    const apiKey = process.env.NEXT_PUBLIC_COVALENT_API_KEY;
    const rpcUrl =
      process.env.NEXT_PUBLIC_SONIC_RPC_URL || "https://rpc.soniclabs.com";

    const balancesUrl = `https://api.covalenthq.com/v1/${chainId}/address/${walletAddress}/balances_v2/?key=${apiKey}`;
    const txsUrl = `https://api.covalenthq.com/v1/${chainId}/address/${walletAddress}/transactions_v3/?key=${apiKey}`;

    async function fetchData() {
      try {
        const [balancesRes, txsRes] = await Promise.all([
          fetch(balancesUrl).then((r) => r.json()),
          fetch(txsUrl).then((r) => r.json()),
        ]);

        let balancesData = balancesRes.data?.items || [];

        // 👇 Check if Covalent returned zero SONIC, then fallback to RPC
        const sonicToken = balancesData.find(
          (b: Balance) => b.contract_ticker_symbol === "S"
        );
        if (!sonicToken || parseFloat(sonicToken.balance) === 0) {
          console.warn("Covalent returned 0 balance, falling back to RPC...");
          try {
            const rpcRes = await fetch(rpcUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_getBalance",
                params: [walletAddress, "latest"],
                id: 1,
              }),
            }).then((r) => r.json());

            const balanceHex = rpcRes?.result || "0x0";
            const balance = parseInt(balanceHex, 16) / 1e18;
            console.log("RPC balance:", balance);

            balancesData = [
              {
                contract_address: "0x0000000000000000000000000000000000000000",
                contract_ticker_symbol: "S",
                contract_decimals: 18,
                balance: String(balance * 1e18),
              },
            ];
          } catch (err) {
            console.error("RPC fallback failed:", err);
          }
        }

        setBalances(balancesData);
        setTxs(txsRes.data?.items || []);
      } catch (err) {
        console.error("Error fetching balances/txs:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [walletAddress]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Navbar */}
      <header className="w-full border-b border-gray-800 p-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-500">
          ⚡ Sonic Wallet Tracker
        </h1>
        {authenticated ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{walletAddress}</span>
            <button
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded"
              onClick={logout}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded"
            onClick={login}
          >
            Connect Wallet
          </button>
        )}
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-gray-800 p-6 flex flex-col gap-6">
          {/* Wallet */}
          <div>
            <h2 className="text-md font-semibold mb-2 text-blue-400">Wallet</h2>
            <input
              type="text"
              placeholder="Paste wallet address"
              className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={walletAddress}
              readOnly={authenticated}
            />
          </div>

          {/* Balances */}
          <div>
            <h3 className="text-md font-semibold mb-2 text-blue-400">
              Balances
            </h3>
            <div className="bg-gray-900 rounded p-3 min-h-[100px] text-sm">
              {loading && <span className="text-gray-500">Loading...</span>}
              {!loading && balances.length === 0 && (
                <span className="text-gray-500">No balances yet</span>
              )}
              {!loading && balances.length > 0 && (
                <ul className="space-y-1">
                  {balances.map((bal) => {
                    // Covalent returns balance as string in base units
                    const rawBalance =
                      typeof bal.balance === "string"
                        ? bal.balance
                        : String(bal.balance);
                    const displayBalance =
                      parseFloat(rawBalance) /
                      Math.pow(10, bal.contract_decimals);
                    return (
                      <li
                        key={bal.contract_address}
                        className="flex justify-between text-gray-300"
                      >
                        <span>{bal.contract_ticker_symbol}</span>
                        <span>{displayBalance.toFixed(5)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>

        {/* Transactions */}
        <main className="flex-1 p-6 overflow-y-auto">
          <h3 className="text-md font-semibold mb-2 text-blue-400">
            Transactions
          </h3>
          <div className="bg-gray-900 rounded p-3 text-sm">
            {loading && <span className="text-gray-500">Loading...</span>}
            {!loading && txs.length === 0 && (
              <span className="text-gray-500">No transactions yet</span>
            )}
            {!loading && txs.length > 0 && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-400 text-xs">
                    <th className="py-1">Hash</th>
                    <th className="py-1">Time</th>
                    <th className="py-1">Token</th>
                    <th className="py-1">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((tx) => (
                    <tr key={tx.tx_hash} className="border-t border-gray-800">
                      <td>
                        <a
                          href={`https://explorer.sonicchain.io/tx/${tx.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {tx.tx_hash.slice(0, 6)}...{tx.tx_hash.slice(-4)}
                        </a>
                      </td>
                      <td>{tx.block_signed_at}</td>
                      <td>{tx.token_symbol || "SONIC"}</td>
                      <td>{tx.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-gray-800 p-3 text-center text-gray-600 text-xs">
        Powered by Sonic ⚡ + Covalent 🟦
      </footer>
    </div>
  );
}

export default function Dashboard() {
  return (
    <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}>
      <DashboardContent />
    </PrivyProvider>
  );
}
