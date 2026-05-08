import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { allPosts } from "content-collections";
import { ogMeta } from "@jxdltd/tanstack/og/router";
import { pageMeta, SITE_NAME, SITE_URL } from "../../lib/seo";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { RadialDots } from "../../components/RadialDots";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  head: (ctx) => {
    const seo = pageMeta({
      title: "Blog | Auvia",
      description:
        "Notes on client intake, conversion, and the economics of running a modern UK law or accountancy firm.",
      path: "/blog",
    });
    return {
      meta: [...seo.meta, ...ogMeta(ctx, { siteName: SITE_NAME, siteUrl: SITE_URL })],
      links: seo.links,
    };
  },
});

function BlogIndex() {
  const posts = [...allPosts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <div className="bg-white text-zinc-900">
      <SiteHeader />

      <section className="relative isolate overflow-hidden">
        <RadialDots />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-20 -z-10 mx-auto h-[400px] max-w-3xl bg-linear-to-b from-blue-200/20 to-transparent blur-3xl"
        />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-12 lg:px-8 lg:pt-28 lg:pb-16">
          <p className="text-sm font-medium text-blue-600">From the team</p>
          <h1 className="mt-3 max-w-[24ch] text-4xl font-semibold tracking-tight text-balance lg:text-6xl">
            Notes on client intake.
          </h1>
          <p className="mt-6 max-w-[58ch] text-lg text-pretty text-zinc-600">
            What we've learned helping UK law firms and accountancy practices stop losing enquiries
            to slow response times.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 pb-24 lg:px-8 lg:pb-32">
          {posts.length === 0 ? (
            <p className="text-sm text-zinc-500">No posts yet.</p>
          ) : (
            <ul role="list" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <li key={p.slug}>
                  <Link
                    to="/blog/$slug"
                    params={{ slug: p.slug }}
                    className="group flex h-full flex-col rounded-xl bg-white p-6 ring-1 ring-zinc-200/80 shadow-sm transition hover:ring-zinc-300"
                  >
                    {p.tag && (
                      <p className="text-xs font-medium tracking-wide text-blue-600 uppercase">
                        {p.tag}
                      </p>
                    )}
                    <h2 className="mt-3 text-lg font-semibold tracking-tight text-balance text-zinc-900">
                      {p.title}
                    </h2>
                    <p className="mt-3 text-sm text-pretty text-zinc-600">{p.excerpt}</p>
                    <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
                      <span className="tabular-nums">{formatDate(p.date)}</span>
                      <span>{p.readingTime}</span>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-1.5">
                      Read
                      <ArrowRightIcon weight="bold" className="size-3.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
