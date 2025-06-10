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
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Chain Tools makes Ethereum development and usage more accessible by providing essential calculation tools in one place.
              Whether you're a developer estimating gas costs or a user converting Wei to ETH, we provide accurate, real-time utilities
              to help you navigate the blockchain ecosystem, build by the <a href="https://www.cyfrin.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline"> Cyfrin </a>team.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">🔧 For Developers</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Estimate gas costs, generate EIP-712 hashes, calculate Safe transaction hashes, and compare fees across chains.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">👥 For Users</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Convert between Wei, Gwei, and ETH, understand transaction costs, and compare blockchain fees.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span className="font-medium">{item.question}</span>
                  <svg
                    className={`w-5 h-5 transform transition-transform ${openItems.includes(index) ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openItems.includes(index) && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 dark:text-gray-400">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* More Cyfrin Tools Section */}
        <div id="more-cyfrin-tools" className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">More Cyfrin Tools</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Explore other developer tools and educational resources from the Cyfrin team.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="https://github.com/Cyfrin/aderyn"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Aderyn</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A Solidity static analysis tool</p>
            </a>
            <a
              href="https://github.com/Cyfrin/moccasin"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Moccasin</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A Pythonic Vyper-based smart contract development and testing framework</p>
            </a>
            <a
              href="https://wise-signer.cyfrin.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Wise Signer</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A gamified way to test your skills to verify calldata in transactions</p>
            </a>
            <a
              href="https://github.com/Cyfrin/safe-hash-rs"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Safe Hash RS</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A CLI tool to verify Safe{'{'}Wallet{'}'} hashes</p>
            </a>
            <a
              href="https://github.com/Cyfrin/sc-exploits-minimized"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">SC Exploits Minimized</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A minimized collection of common attacks in web3</p>
            </a>
            <a
              href="https://solidity-by-example.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Solidity by Example</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A site with minimal Solidity examples</p>
            </a>
            <a
              href="https://vyper-by-example.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Vyper by Example</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">A site with a set of minimal Vyper examples</p>
            </a>
            <a
              href="https://updraft.cyfrin.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Cyfrin Updraft</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">The #1 place to learn Solidity, smart contract security, Vyper, and all things technical in web3</p>
            </a>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Get Involved</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Chain Tools is a community-driven project. We welcome contributions, feedback, and suggestions.
          </p>
          <div className="flex gap-4">
            <a
              href="https://github.com/cyfrin/chain-tools"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              View on GitHub
            </a>
            <a
              href="https://github.com/cyfrin/chain-tools/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Report Issue
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}