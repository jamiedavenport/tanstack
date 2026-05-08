import { Link } from "@tanstack/react-router";

type FooterLink = { label: string; href: string };
const FOOTER_COLS: { title: string; links: FooterLink[] }[] = [
  // {
  //   title: "Product",
  //   links: [
  //     { label: "Features", href: "#" },
  //     { label: "How it works", href: "#" },
  //     { label: "Pricing", href: "#" },
  //     { label: "Changelog", href: "#" },
  //   ],
  // },
  // {
  //   title: "Company",
  //   links: [
  //     { label: "About", href: "#" },
  //     { label: "Blog", href: "/blog" },
  //     { label: "Careers", href: "#" },
  //     { label: "Contact", href: "#" },
  //   ],
  // },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200/80 bg-zinc-50/60">
      <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link to="/" aria-label="Homepage" className="flex items-center">
              <span className="font-jakarta text-lg font-black tracking-[0.2em] leading-none">
                Auvia
              </span>
            </Link>
            <p className="mt-5 max-w-[44ch] text-sm text-pretty text-zinc-500">
              AI-powered client intake for law firms and accountancy practices.
            </p>
          </div>
          <div className="flex flex-col gap-10 sm:flex-row lg:gap-16 lg:text-right">
            {FOOTER_COLS.map((c) => (
              <div key={c.title}>
                <h3 className="text-sm font-semibold">{c.title}</h3>
                <ul role="list" className="mt-4 space-y-3 text-sm">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      {l.href.startsWith("/") ? (
                        <Link to={l.href} className="font-normal text-zinc-600 hover:text-zinc-900">
                          {l.label}
                        </Link>
                      ) : (
                        <a href={l.href} className="font-normal text-zinc-600 hover:text-zinc-900">
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/80 pt-6 text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Auvia. All rights reserved.</p>
          <a
            href="https://jxd.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-900"
          >
            Built by <span className="font-medium text-zinc-700">jxd.dev</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
