'use client'

import { useState } from 'react'
import Link from 'next/link'

export function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="fixed top-0 w-full z-50 bg-background/50 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">P</span>
          </div>
          <span className="text-xl font-bold text-foreground">Provenance</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="#problem" className="text-sm text-muted-foreground hover:text-foreground transition">
            Problem
          </Link>
          <Link href="#solution" className="text-sm text-muted-foreground hover:text-foreground transition">
            Solution
          </Link>
          <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition">
            Features
          </Link>
          <Link href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition">
            Demo
          </Link>
        </nav>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-foreground hover:text-primary transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <nav className="md:hidden bg-background/95 backdrop-blur border-b border-border">
          <div className="px-4 py-2 space-y-2">
            <Link href="#problem" className="block text-sm text-muted-foreground hover:text-foreground py-2 transition">
              Problem
            </Link>
            <Link href="#solution" className="block text-sm text-muted-foreground hover:text-foreground py-2 transition">
              Solution
            </Link>
            <Link href="#features" className="block text-sm text-muted-foreground hover:text-foreground py-2 transition">
              Features
            </Link>
            <Link href="#demo" className="block text-sm text-muted-foreground hover:text-foreground py-2 transition">
              Demo
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
