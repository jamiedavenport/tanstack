import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { allPosts } from "content-collections";
import { pageMeta } from "../../lib/seo";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { MdxContent } from "../../components/MdxContent";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = allPosts.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    return post;
  },
  component: BlogPost,
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return pageMeta({
      title: `${loaderData.title} | Auvia`,
      description: loaderData.excerpt,
      path: `/blog/${loaderData.slug}`,
      type: "article",
      publishedTime: loaderData.date,
      image: `/og/blog/${loaderData.slug}.png`,
    });
  },
});

function BlogPost() {
  const post = Route.useLoaderData();

  return (
    <div className="bg-white text-zinc-900">
      <SiteHeader />

      <article>
        <div className="mx-auto max-w-3xl px-6 pt-16 pb-10 lg:px-8 lg:pt-24 lg:pb-12">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            <ArrowLeftIcon weight="bold" className="size-3.5" />
            All posts
          </Link>
          {post.tag && (
            <p className="mt-10 text-xs font-medium tracking-wide text-blue-600 uppercase">
              {post.tag}
            </p>
          )}
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
            {post.title}
          </h1>
          <p className="mt-6 max-w-[58ch] text-lg text-pretty text-zinc-600">{post.excerpt}</p>
          <div className="mt-8 flex items-center gap-4 text-sm text-zinc-500">
            {post.author && (
              <>
                <span className="text-zinc-700">{post.author}</span>
                <span aria-hidden="true" className="size-1 rounded-full bg-zinc-300" />
              </>
            )}
            <time dateTime={post.date} className="tabular-nums">
              {formatDate(post.date)}
            </time>
            <span aria-hidden="true" className="size-1 rounded-full bg-zinc-300" />
            <span>{post.readingTime}</span>
          </div>
        </div>

        <div className="border-t border-zinc-200/80">
          <div className="mx-auto max-w-3xl px-6 py-12 text-base leading-relaxed lg:px-8 lg:py-16">
            <MdxContent code={post.body} />
          </div>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
