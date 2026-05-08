import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  ChatCircleDotsIcon,
  ClockIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { ogMeta } from "@jxdltd/tanstack/og/router";
import { pageMeta, SITE_NAME, SITE_URL } from "../lib/seo";
import { ChatbotDemo } from "../components/ChatbotDemo";
import { AdminDashboard } from "../components/AdminDashboard";
import { RadialDots } from "../components/RadialDots";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";

export const Route = createFileRoute("/")({
  component: Home,
  head: (ctx) => {
    const seo = pageMeta({
      title: "Auvia | AI client intake for law firms and accountants",
      description:
        "Auvia responds in seconds, qualifies automatically, and books the meeting directly into your fee earner's calendar, 24 hours a day, without your team lifting a finger.",
      path: "/",
    });
    return {
      meta: [...seo.meta, ...ogMeta(ctx, { siteName: SITE_NAME, siteUrl: SITE_URL })],
      links: seo.links,
    };
  },
});

const FEATURES = [
  {
    title: "Responds in seconds, not days",
    body: "When a potential client fills in your contact form at 9pm on a Sunday, Auvia responds immediately, not Tuesday morning when it's too late.",
    Icon: ClockIcon,
  },
  {
    title: "Filters out the tyre-kickers",
    body: "Auvia asks the right questions to establish whether an enquiry is worth your time. Fee earners only speak to people who are a genuine fit.",
    Icon: ChatCircleDotsIcon,
  },
  {
    title: "Books the meeting and briefs the fee earner",
    body: "Qualified leads are booked straight into the calendar. Before the call, the fee earner gets a full briefing note: who they're speaking to, what they need, and what they've already said.",
    Icon: CalendarCheckIcon,
  },
];

const STEPS = [
  {
    title: "We learn your firm",
    body: "Your practice areas, your ideal client, how your fee earners work.",
  },
  {
    title: "We build and deploy",
    body: "Auvia goes live on your site, connected to your calendar. No technical work from your team.",
  },
  {
    title: "Qualified meetings land in your diary",
    body: "Every good lead booked, every fee earner fully briefed before the call.",
  },
];

function HandUnderline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 -bottom-[0.18em] h-[0.22em] w-full text-blue-400"
    >
      <path
        d="M3 9 C 60 1 110 14 197 6"
        vectorEffect="non-scaling-stroke"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function Home() {
  return (
    <div className="bg-white text-zinc-900">
      <SiteHeader />

      <section className="relative isolate overflow-hidden">
        <RadialDots />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-20 -z-10 mx-auto h-[480px] max-w-3xl bg-linear-to-b from-blue-200/20 to-transparent blur-3xl"
        />
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-24 text-center lg:px-8 lg:pt-32 lg:pb-32">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 ring-1 ring-blue-200/60">
            <SparkleIcon weight="fill" className="size-3.5 text-blue-500" />
            Built for professional services
          </div>
          <h1 className="mx-auto mt-8 max-w-[22ch] text-5xl font-semibold tracking-tight text-balance lg:text-7xl">
            Your firm is spending money getting enquiries. Most of them{" "}
            <span className="relative inline-block text-blue-600">
              go unanswered
              <HandUnderline />
            </span>
            .
          </h1>
          <p className="mx-auto mt-6 max-w-[58ch] text-lg text-pretty text-zinc-600">
            Auvia responds in seconds, qualifies automatically, and books the meeting directly into
            your fee earner's calendar, 24 hours a day, without your team lifting a finger.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://cal.com/paul-o-sullivan-sweeney-9ukywx/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-500"
            >
              Book a demo
              <ArrowRightIcon weight="bold" className="size-4" />
            </a>
            {/* <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("open-chatbot"))}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
            >
              <PlayIcon weight="fill" className="size-3.5 text-blue-600" />
              Try now
            </button> */}
          </div>
          <ChatbotDemo />
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
          <dl className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            <div className="text-center">
              <dt className="text-4xl font-semibold tracking-tight text-blue-600 lg:text-5xl">
                £1.34M
              </dt>
              <dd className="mx-auto mt-3 max-w-[34ch] text-sm text-pretty text-zinc-600">
                average lost annually by UK law firms from slow lead response
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-4xl font-semibold tracking-tight text-blue-600 lg:text-5xl">
                42 hours
              </dt>
              <dd className="mx-auto mt-3 max-w-[34ch] text-sm text-pretty text-zinc-600">
                average response time to a new enquiry
              </dd>
            </div>
            <div className="text-center">
              <dt className="text-4xl font-semibold tracking-tight text-blue-600 lg:text-5xl">
                400%
              </dt>
              <dd className="mx-auto mt-3 max-w-[34ch] text-sm text-pretty text-zinc-600">
                uplift in conversion when responding within 60 seconds
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-24 lg:px-8 lg:py-32">
          <div>
            <p className="text-sm font-medium text-blue-600">What it does</p>
            <h2 className="mt-3 max-w-[28ch] text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
              Every enquiry handled. Every meeting booked. No staff required.
            </h2>
          </div>
          <dl className="mt-16 grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl bg-white p-6 ring-1 ring-zinc-200/80 shadow-sm"
              >
                <dt className="text-base font-semibold">
                  <f.Icon weight="fill" className="size-5 text-blue-600" aria-hidden="true" />
                  <span className="mt-5 block">{f.title}</span>
                </dt>
                <dd className="mt-2 text-sm text-pretty text-zinc-600">{f.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-6 py-24 lg:px-8 lg:py-32">
          <div>
            <p className="text-sm font-medium text-blue-600">How it works</p>
            <h2 className="mt-3 max-w-[26ch] text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
              We set it up. You take the calls.
            </h2>
          </div>
          <ol role="list" className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-xl bg-white p-6 ring-1 ring-zinc-200/80">
                <p className="inline-flex size-7 items-center justify-center rounded-md bg-zinc-900 text-xs font-semibold text-white tabular-nums">
                  {i + 1}
                </p>
                <h3 className="mt-5 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-pretty text-zinc-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-24 lg:px-8 lg:py-32">
          <div>
            <p className="text-sm font-medium text-blue-600">Your dashboard</p>
            <h2 className="mt-3 max-w-[28ch] text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
              Every enquiry, every channel, in one place.
            </h2>
            <p className="mt-6 max-w-[58ch] text-lg text-pretty text-zinc-600">
              Watch what's coming in, see what Auvia is filtering, and tune how it qualifies as your
              firm grows.
            </p>
          </div>
          <AdminDashboard />
        </div>
      </section>

      <section className="relative isolate overflow-hidden">
        <RadialDots />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center lg:px-8 lg:py-32">
          <p className="text-2xl font-medium tracking-tight text-balance lg:text-3xl">
            67% of clients hire the first firm that calls them back. The firm that responds in five
            minutes wins. The one that responds on Tuesday loses.
          </p>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-t border-zinc-200/80">
        <RadialDots />
        <div className="mx-auto max-w-6xl px-6 py-24 text-center lg:px-8 lg:py-32">
          <h2 className="mx-auto max-w-[26ch] text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
            Every week you wait is another week of{" "}
            <span className="relative inline-block text-blue-600">
              missed enquiries
              <HandUnderline />
            </span>
            .
          </h2>
          <p className="mx-auto mt-5 max-w-[58ch] text-lg text-pretty text-zinc-600">
            The average UK law firm loses £1.34M a year from slow lead handling. The average
            accountancy firm loses £1.1M. Auvia fixes this, and it's live within days.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://cal.com/paul-o-sullivan-sweeney-9ukywx/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-500"
            >
              Book a demo
              <ArrowRightIcon weight="bold" className="size-4" />
            </a>
            {/* <a
              href="#"
              className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
            >
              Talk to us
            </a> */}
          </div>
        </div>
      </section>

      <SiteFooter />

      <section aria-hidden="true" className="relative overflow-hidden bg-zinc-50/60">
        <p className="-mb-[0.18em] bg-linear-to-b from-zinc-300 via-zinc-200/50 to-transparent bg-clip-text px-6 text-center text-[clamp(6rem,30vw,24rem)] leading-[0.85] font-semibold tracking-tighter text-transparent select-none">
          Auvia
        </p>
      </section>
    </div>
  );
}
