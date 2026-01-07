import { Github, ExternalLink } from "lucide-react";

/**
 * Footer Component
 * Design: Kinetic Minimalism - Clean, minimal footer with links
 * - GitHub repository link
 * - Author attribution
 * - Simple, uncluttered design
 */

export default function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h4 className="font-semibold text-foreground mb-3" style={{ fontFamily: 'Poppins' }}>
              Convert Buddy
            </h4>
            <p className="text-sm text-muted-foreground">
              Lightning-fast file parser for CSV and XML. Built with Rust + WASM for maximum performance.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3" style={{ fontFamily: 'Poppins' }}>
              Resources
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/brunohanss/convert-buddy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-accent transition-colors flex items-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  GitHub Repository
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/brunohanss"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-accent transition-colors flex items-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  Author: @brunohanss
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Stats */}
          <div>
            <h4 className="font-semibold text-foreground mb-3" style={{ fontFamily: 'Poppins' }}>
              Performance
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>CSV: 30-60 MB/s</li>
              <li>XML: 40-90 MB/s</li>
              <li>WASM: 162 KB</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
            <p>© 2025 Convert Buddy. Built by Bruno Hanss.</p>
            <p>MIT License</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
