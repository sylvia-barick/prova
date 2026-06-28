import Link from 'next/link'

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-background/30 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">P</span>
              </div>
              <span className="font-semibold text-foreground">Provenance</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Decision tracking for fast-moving teams, built on HydraDB.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition text-sm">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition text-sm">
                  Security
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition text-sm">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition text-sm">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition text-sm">
                  API Reference
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition text-sm">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition text-sm">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition text-sm">
                  Twitter
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-muted-foreground text-sm">
          <p>&copy; 2025 Provenance. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground transition">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground transition">
              Status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
