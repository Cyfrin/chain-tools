/*
 * Chain Tools - Ethereum utilities for developers
 * Copyright (C) 2025
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const TOOLS = [
  { name: 'Gas Estimator', href: '/gas-estimator' },
  { name: 'Fee Leaderboard', href: '/fee-leaderboard' },
  { name: 'Wei Converter', href: '/wei-converter' },
  { name: 'ABI Encoding', href: '/abi-encoding' },
  { name: 'EIP-712 Hash', href: '/eip712-hash' },
  { name: 'Safe Wallet Hash', href: '/safe-hash' },
  { name: 'About', href: '/about' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header
      className={`w-full border-b bg-white dark:bg-black sticky top-0 z-50 transition-all duration-200 ${
        isScrolled
          ? 'border-gray-200 dark:border-gray-800 shadow-md'
          : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Home button */}
          <Link
            href="/"
            className="flex items-center text-lg font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            Chain Tools
          </Link>

          {/* Right: GitHub icon and hamburger menu */}
          <div className="flex items-center gap-2">
            {/* GitHub icon */}
            <a
              href="https://github.com/cyfrin/chain-tools"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-150 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>

            {/* Hamburger menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-150 cursor-pointer"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Dropdown menu */}
              <div
                className={`absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden transition-all duration-200 origin-top-right ${
                  isMenuOpen
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }`}
              >
                <div className="py-1">
                  {TOOLS.map((tool, index) => (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className={`block px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                        index === TOOLS.length - 1 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {tool.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
