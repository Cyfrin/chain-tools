import Link from "next/link";

export default function Home() {
  return (
    <div className="flex items-center justify-center p-8 py-12 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-6 items-center">
        <h1 className="text-4xl font-bold text-center">Chain Tools</h1>
        <p className="text-lg text-center text-gray-600 dark:text-gray-400">
          Ethereum gas estimation, unit conversion, ABI encoding/decoding, and cryptographic hash tools
        </p>
        
        <div className="grid gap-4 items-center grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/gas-estimator"
            className="rounded-lg border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-base h-12 px-8 min-w-[200px]"
          >
            Gas Estimator
          </Link>
          <Link
            href="/fee-leaderboard"
            className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-base h-12 px-8 min-w-[200px]"
          >
            Fee Leaderboard
          </Link>
          <Link
            href="/wei-converter"
            className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-base h-12 px-8 min-w-[200px]"
          >
            Wei Converter
          </Link>
          <Link
            href="/abi-encoding"
            className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-base h-12 px-8 min-w-[200px]"
          >
            ABI Encoding
          </Link>
          <Link
            href="/eip712-hash"
            className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-base h-12 px-8 min-w-[200px]"
          >
            EIP-712 Hash
          </Link>
          <Link
            href="/safe-hash"
            className="rounded-lg border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-base h-12 px-8 min-w-[200px]"
          >
            Safe Wallet Hash
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/about#more-cyfrin-tools"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Explore More Cyfrin Tools →
          </Link>
        </div>
      </main>
    </div>
  );
}
