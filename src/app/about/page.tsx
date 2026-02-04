'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is Chain Tools?",
    answer: "Chain Tools is a free, open-source collection of Ethereum utilities designed for developers and users built by the Cyfrin team. It provides essential tools for gas estimation, unit conversion, and cryptographic hash calculations, all in one convenient platform."
  },
  {
    question: "Is Chain Tools free to use?",
    answer: "Yes! Chain Tools is completely free to use. There are no fees, subscriptions, or usage limits. The project is open source under the AGPL-3.0 license."
  },
  {
    question: "How accurate are the gas estimates?",
    answer: "Gas prices are fetched in real-time from each blockchain's RPC endpoints, and ETH prices come from CoinGecko, and then caches for 1 to 2 minutes. So at best they are real-time, at worst they are a few minutes old."
  },
  {
    question: "How do I report bugs or request features?",
    answer: "Please visit our GitHub repository and create an issue. We welcome bug reports, feature requests, and general feedback from the community."
  }
];

export default function About() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">About Chain Tools</h1>

        {/* About Section */}
        <div className="mb-12">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-6 rounded-xl mb-8">
            <h2 className="text-xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Chain Tools makes Ethereum development and usage more accessible by providing essential calculation tools in one place.
              Whether you're a developer estimating gas costs or a user converting Wei to ETH, we provide accurate, real-time utilities
              to help you navigate the blockchain ecosystem, build by the <a href="https://www.cyfrin.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline"> Cyfrin </a>team.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-900 border border-orange-200 dark:border-orange-800 p-5 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="font-semibold">For Developers</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Estimate gas costs, generate EIP-712 hashes, calculate Safe transaction hashes, and compare fees across chains.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-900 border border-purple-200 dark:border-purple-800 p-5 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold">For Users</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Convert between Wei, Gwei, and ETH, understand transaction costs, and compare blockchain fees.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <span className="font-medium">{item.question}</span>
                  <svg
                    className={`w-5 h-5 transform transition-transform duration-200 ${openItems.includes(index) ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    openItems.includes(index) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 dark:text-gray-400">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* More Cyfrin Tools Section */}
        <div id="more-cyfrin-tools" className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-xl">
          <h3 className="text-xl font-semibold mb-4">More Cyfrin Tools</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Explore other developer tools and educational resources from the Cyfrin team.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="https://github.com/Cyfrin/aderyn"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300">Aderyn</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A Solidity static analysis tool</p>
            </a>
            <a
              href="https://github.com/Cyfrin/moccasin"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300">Moccasin</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A Pythonic Vyper-based smart contract development and testing framework</p>
            </a>
            <a
              href="https://wise-signer.cyfrin.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300">Wise Signer</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A gamified way to test your skills to verify calldata in transactions</p>
            </a>
            <a
              href="https://github.com/Cyfrin/safe-hash-rs"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300">Safe Hash RS</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A CLI tool to verify Safe{'{'}Wallet{'}'} hashes</p>
            </a>
            <a
              href="https://github.com/Cyfrin/sc-exploits-minimized"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300">SC Exploits Minimized</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A minimized collection of common attacks in web3</p>
            </a>
            <a
              href="https://solidity-by-example.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300">Solidity by Example</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A site with minimal Solidity examples</p>
            </a>
            <a
              href="https://vyper-by-example.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300">Vyper by Example</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A site with a set of minimal Vyper examples</p>
            </a>
            <a
              href="https://updraft.cyfrin.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300">Cyfrin Updraft</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">The #1 place to learn Solidity, smart contract security, Vyper, and all things technical in web3</p>
            </a>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">Get Involved</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Chain Tools is a community-driven project. We welcome contributions, feedback, and suggestions.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/cyfrin/chain-tools"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2.5 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-medium cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
            <a
              href="https://github.com/cyfrin/chain-tools/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-300 dark:border-gray-600 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium cursor-pointer"
            >
              Report Issue
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
