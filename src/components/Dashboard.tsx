"use client";

import React, { useEffect, useState } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";

interface Balance {
  contract_address: string;
  contract_ticker_symbol: string;
  contract_decimals: number;
  balance: number;
}

function DashboardContent() {
  const { login, logout, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets?.[0]?.address || "";

  // State for balances and transactions
  const [balances, setBalances] = useState<Balance[]>([]);
  interface Transaction {
    tx_hash: string;
    block_signed_at: string;
    token_symbol?: string;
    value: number | string;
    successful: boolean;
    // Add other fields as needed based on API response
  }

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch balances and transactions when walletAddress changes
  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    const chainId = process.env.NEXT_PUBLIC_SONIC_CHAIN_ID;
    const apiKey = process.env.NEXT_PUBLIC_COVALENT_API_KEY;
    const balancesUrl = `https://api.covalenthq.com/v1/${chainId}/address/${walletAddress}/balances_v2/?key=${apiKey}`;
    const txsUrl = `https://api.covalenthq.com/v1/${chainId}/address/${walletAddress}/transactions_v3/?key=${apiKey}`;

    Promise.all([
      fetch(balancesUrl).then((r) => r.json()),
      fetch(txsUrl).then((r) => r.json()),
    ])
      .then(([balancesRes, txsRes]) => {
        setBalances(balancesRes.data?.items || []);
        setTxs(txsRes.data?.items || []);
      })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Navbar */}
      <header className="w-full border-b border-gray-800 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          ⚡ Sonic Wallet Tracker
        </h1>
        {authenticated ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">{walletAddress}</span>
            <button
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
              onClick={logout}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium"
            onClick={login}
          >
            Connect Wallet
          </button>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-80 border-r border-gray-800 p-6 flex flex-col gap-6">
          {/* Wallet Input */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Wallet</h2>
            <input
              type="text"
              placeholder="Paste wallet address"
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={walletAddress}
              readOnly={authenticated}
            />
          </div>

          {/* Balances */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Balances</h3>
            <div className="bg-gray-900 rounded-lg p-4 min-h-[120px] flex flex-col gap-2">
              {loading && <span className="text-gray-400">Loading...</span>}
              {!loading && balances.length === 0 && (
                <span className="text-gray-400">Balances will appear here</span>
              )}
              {!loading && balances.length > 0 && (
                <ul>
                  {balances.map((bal) => (
                    <li
                      key={bal.contract_address}
                      className="flex justify-between"
                    >
                      <span>{bal.contract_ticker_symbol}</span>
                      <span>{bal.balance / 10 ** bal.contract_decimals}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>

        {/* Right Content */}
        <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Transactions */}
          <div>
            <h3 className="text-lg font-semibold mb-3"> Live Transactions</h3>
            <div className="bg-gray-900 rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
              {loading && <span className="text-gray-400">Loading...</span>}
              {!loading && txs.length === 0 && (
                <span className="text-gray-400">No transactions yet</span>
              )}
              {!loading && txs.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left">Hash</th>
                      <th className="text-left">Timestamp</th>
                      <th className="text-left">Token</th>
                      <th className="text-left">Value</th>
                      <th className="text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((tx) => (
                      <tr key={tx.tx_hash} className="border-b border-gray-800">
                        <td className="pr-2">
                          <a
                            href={`https://explorer.sonicchain.io/tx/${tx.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            {tx.tx_hash.slice(0, 8)}...{tx.tx_hash.slice(-6)}
                          </a>
                        </td>
                        <td>{tx.block_signed_at}</td>
                        <td>{tx.token_symbol || "SONIC"}</td>
                        <td>{tx.value}</td>
                        <td>{tx.successful ? "Finalized" : "Pending"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-gray-800 p-4 text-center text-gray-500 text-sm">
        Powered by ⚡ Sonic + 🟦 Covalent
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
