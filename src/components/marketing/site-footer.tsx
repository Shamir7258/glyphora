import Link from "next/link";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/fonts", label: "All fonts" },
      { href: "/originals", label: "Glyphora Originals" },
      { href: "/bundles", label: "Bundles" },
      { href: "/designers", label: "Designers" },
    ],
  },
  {
    title: "For designers",
    links: [
      { href: "/designer-register", label: "Become a designer" },
      { href: "/seller/dashboard", label: "Seller dashboard" },
      { href: "/seller/fonts/new", label: "Upload a font" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/account", label: "Your account" },
      { href: "/account/purchases", label: "Order history" },
      { href: "/fonts", label: "Licensing" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="font-display text-xl tracking-tight">
              Glyphora
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Find the type that defines your brand.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/80 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Glyphora. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
