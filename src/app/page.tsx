import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center">
        <h1 className="text-4xl font-bold text-center">Gas Tools</h1>
        <p className="text-lg text-center text-gray-600 dark:text-gray-400">
          Ethereum gas estimation and unit conversion tools
        </p>
        
        <div className="flex gap-6 items-center flex-col sm:flex-row">
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
        </div>
      </main>
    </div>
  );
}
