import Link from "next/link";

export default function Home() {
  return (
    <div className="flex items-center justify-center p-8 py-16 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 items-center max-w-4xl">
        {/* Hero section with subtle gradient */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent">
            Chain Tools
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
            Ethereum gas estimation, unit conversion, ABI encoding/decoding, and cryptographic hash tools
          </p>
        </div>

        {/* Tool cards grid */}
        <div className="grid gap-4 items-stretch grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full mt-4">
          <Link
            href="/gas-estimator"
            className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-900 p-6 transition-all duration-200 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Gas Estimator</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Estimate transaction costs in ETH and USD</p>
          </Link>

          <Link
            href="/fee-leaderboard"
            className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-gray-900 p-6 transition-all duration-200 hover:shadow-lg hover:border-green-300 dark:hover:border-green-700 hover:-translate-y-0.5 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Fee Leaderboard</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Compare gas costs across chains</p>
          </Link>

          <Link
            href="/wei-converter"
            className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-900 p-6 transition-all duration-200 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 hover:-translate-y-0.5 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Wei Converter</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Convert between Wei, Gwei, and ETH</p>
          </Link>

          <Link
            href="/abi-encoding"
            className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-gray-900 p-6 transition-all duration-200 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700 hover:-translate-y-0.5 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">ABI Encoding</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Encode and decode ABI data</p>
          </Link>

          <Link
            href="/eip712-hash"
            className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-gray-900 p-6 transition-all duration-200 hover:shadow-lg hover:border-cyan-300 dark:hover:border-cyan-700 hover:-translate-y-0.5 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">EIP-712 Hash</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Calculate typed data hashes</p>
          </Link>

          <Link
            href="/safe-hash"
            className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-gray-900 p-6 transition-all duration-200 hover:shadow-lg hover:border-pink-300 dark:hover:border-pink-700 hover:-translate-y-0.5 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Safe Wallet Hash</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Verify Safe transaction hashes</p>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/about#more-cyfrin-tools"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            Explore More Cyfrin Tools
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
