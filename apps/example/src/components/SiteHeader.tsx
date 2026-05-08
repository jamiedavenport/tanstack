import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-x-6 px-6 py-4 lg:px-8">
        <Link to="/" aria-label="Homepage" className="flex items-center">
          <span className="font-jakarta text-lg font-black tracking-[0.2em] leading-none">
            Auvia
          </span>
        </Link>
        <div className="flex items-center gap-x-6">
          {/* <Link
            to="/blog"
            className="text-sm text-zinc-600 hover:text-zinc-900"
            activeProps={{ className: "text-sm text-zinc-900" }}
          >
            Blog
          </Link> */}
          <a
            href="https://cal.com/paul-o-sullivan-sweeney-9ukywx/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-500"
          >
            Book a demo
            <ArrowRightIcon weight="bold" className="size-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
