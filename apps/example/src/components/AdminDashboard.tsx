import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useMotionValue } from "motion/react";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";

const MATTERS: { label: string; value: number }[] = [
  { label: "Family Law", value: 100 },
  { label: "Wills & Probate", value: 86 },
  { label: "Commercial Dispute", value: 72 },
  { label: "Debt Recovery", value: 60 },
  { label: "Employment Law", value: 54 },
  { label: "Immigration", value: 48 },
  { label: "Conveyancing", value: 38 },
  { label: "Personal Injury", value: 28 },
  { label: "Criminal Defence", value: 18 },
];

const CHANNELS: { label: string; value: number; pct: number; color: string }[] = [
  { label: "Embedded Widget", value: 19, pct: 40, color: "bg-blue-600" },
  { label: "Web Chat", value: 19, pct: 40, color: "bg-blue-300" },
  { label: "Contact Form", value: 9, pct: 19, color: "bg-violet-500" },
];

const ROWS: {
  date: string;
  channel: string;
  matter: string;
  qual: "Qualified" | "Awaiting" | "Referred out";
  booking: "Meeting booked" | "Not booked" | "Callback requested";
  earner: string;
  status: "Open" | "Progressed" | "Closed" | "Lost";
}[] = [
  {
    date: "21/04/2026 16:48",
    channel: "Contact Form",
    matter: "Commercial Dispute",
    qual: "Qualified",
    booking: "Meeting booked",
    earner: "James Hargrove",
    status: "Lost",
  },
  {
    date: "21/04/2026 16:28",
    channel: "Web Chat",
    matter: "Employment Law",
    qual: "Qualified",
    booking: "Meeting booked",
    earner: "Sarah Mitchell",
    status: "Open",
  },
  {
    date: "21/04/2026 11:55",
    channel: "Web Chat",
    matter: "Debt Recovery",
    qual: "Qualified",
    booking: "Meeting booked",
    earner: "Claire O'Neill",
    status: "Open",
  },
  {
    date: "21/04/2026 09:43",
    channel: "Web Chat",
    matter: "Family Law",
    qual: "Awaiting",
    booking: "Not booked",
    earner: "Unassigned",
    status: "Open",
  },
  {
    date: "21/04/2026 11:10",
    channel: "Contact Form",
    matter: "Debt Recovery",
    qual: "Qualified",
    booking: "Not booked",
    earner: "Rachel Burns",
    status: "Open",
  },
  {
    date: "21/04/2026 16:42",
    channel: "Web Chat",
    matter: "Criminal Defence",
    qual: "Qualified",
    booking: "Meeting booked",
    earner: "James Hargrove",
    status: "Progressed",
  },
  {
    date: "21/04/2026 18:54",
    channel: "Embedded Widget",
    matter: "Personal Injury",
    qual: "Referred out",
    booking: "Not booked",
    earner: "-",
    status: "Closed",
  },
  {
    date: "21/04/2026 17:38",
    channel: "Embedded Widget",
    matter: "Commercial Dispute",
    qual: "Qualified",
    booking: "Meeting booked",
    earner: "Claire O'Neill",
    status: "Open",
  },
  {
    date: "21/04/2026 19:53",
    channel: "Web Chat",
    matter: "Employment Law",
    qual: "Qualified",
    booking: "Callback requested",
    earner: "David Park",
    status: "Closed",
  },
  {
    date: "21/04/2026 16:05",
    channel: "Web Chat",
    matter: "Wills & Probate",
    qual: "Qualified",
    booking: "Meeting booked",
    earner: "Sarah Mitchell",
    status: "Progressed",
  },
];

const NEW_ARRIVALS: typeof ROWS = [
  {
    date: "21/04/2026 19:58",
    channel: "Web Chat",
    matter: "Family Law",
    qual: "Qualified",
    booking: "Meeting booked",
    earner: "Sarah Mitchell",
    status: "Open",
  },
  {
    date: "21/04/2026 20:04",
    channel: "Embedded Widget",
    matter: "Commercial Dispute",
    qual: "Qualified",
    booking: "Meeting booked",
    earner: "Claire O'Neill",
    status: "Open",
  },
  {
    date: "21/04/2026 20:11",
    channel: "Web Chat",
    matter: "Personal Injury",
    qual: "Qualified",
    booking: "Meeting booked",
    earner: "James Hargrove",
    status: "Open",
  },
];

const fmtInt = (n: number) => Math.round(n).toString();
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function PingDot() {
  return (
    <span className="relative mr-2 inline-flex size-1.5 align-middle">
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-blue-500"
        initial={{ scale: 1, opacity: 0.65 }}
        animate={{ scale: 3.4, opacity: 0 }}
        transition={{
          duration: 1.4,
          ease: "easeOut",
          repeat: 1,
          repeatDelay: 0.2,
        }}
      />
      <span className="relative inline-block size-1.5 rounded-full bg-blue-500" />
    </span>
  );
}

function NumberTick({ value, format }: { value: number; format: (n: number) => string }) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(() => format(value));
  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(format(latest)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display}</>;
}

const QUAL_TONE: Record<(typeof ROWS)[number]["qual"], string> = {
  Qualified: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  Awaiting: "bg-amber-50 text-amber-700 ring-amber-200/80",
  "Referred out": "bg-rose-50 text-rose-700 ring-rose-200/80",
};

const STATUS_TONE: Record<(typeof ROWS)[number]["status"], string> = {
  Open: "text-blue-600",
  Progressed: "text-violet-600",
  Closed: "text-emerald-700",
  Lost: "text-rose-700",
};

const BOOKING_TONE: Record<(typeof ROWS)[number]["booking"], string> = {
  "Meeting booked": "text-emerald-700",
  "Not booked": "text-zinc-500",
  "Callback requested": "text-blue-600",
};

export function AdminDashboard() {
  const conic = `conic-gradient(rgb(37 99 235) 0% 40%, rgb(147 197 253) 40% 80%, rgb(139 92 246) 80% 100%)`;

  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const [arrived, setArrived] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timers: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => setArrived(1), 1600),
      setTimeout(() => setArrived(2), 5400),
      setTimeout(() => setArrived(3), 9200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  const total = 47 + arrived;
  const qualified = 24 + arrived;
  const booked = 18 + arrived;
  const open = 16 + arrived;
  const qualPct = (qualified / total) * 100;
  const meetPct = (booked / qualified) * 100;

  const recentRows = [
    ...NEW_ARRIVALS.slice(0, arrived)
      .slice()
      .reverse()
      .map((r) => ({ ...r, isNew: true as const })),
    ...ROWS.map((r) => ({ ...r, isNew: false as const })),
  ];

  return (
    <div
      ref={ref}
      className="relative isolate mt-14 w-full overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-950/5 shadow-2xl shadow-zinc-300/40"
    >
      <div className="flex items-center justify-between border-b border-zinc-200/80 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-sm shadow-blue-600/30">
            A
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Auvia Insights</p>
            <p className="text-[0.6875rem] text-zinc-500">
              Lead Performance · Professional Services
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <div className="rounded-md bg-zinc-50 px-2.5 py-1 text-[0.6875rem] tabular-nums text-zinc-700 ring-1 ring-zinc-200">
            06 May · 17:09
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-zinc-50 px-2.5 py-1 text-[0.6875rem] text-zinc-700 ring-1 ring-zinc-200">
            <ArrowsClockwiseIcon weight="bold" className="size-3" />
            Refresh
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-zinc-200/80 lg:grid-cols-4 border-b border-zinc-200/80">
        <Kpi
          label="Total enquiries"
          value={<NumberTick value={total} format={fmtInt} />}
          sub="all submissions"
        />
        <Kpi
          label="Qualification rate"
          value={<NumberTick value={qualPct} format={fmtPct} />}
          sub={
            <>
              <NumberTick value={qualified} format={fmtInt} /> of{" "}
              <NumberTick value={total} format={fmtInt} /> qualified
            </>
          }
          accent="text-blue-600"
        />
        <Kpi
          label="Meeting conversion"
          value={<NumberTick value={meetPct} format={fmtPct} />}
          sub="of qualified leads"
          accent="text-blue-600"
        />
        <Kpi
          label="Meetings booked"
          value={<NumberTick value={booked} format={fmtInt} />}
          sub="confirmed bookings"
        />
      </div>

      <div className="grid gap-px bg-zinc-200/80 lg:grid-cols-[1.55fr_1fr]">
        <div className="bg-white px-5 py-5">
          <p className="text-[0.6875rem] tracking-wider text-zinc-500 uppercase">
            Enquiries by matter type
          </p>
          <div className="mt-5 space-y-2.5">
            {MATTERS.map((m) => (
              <div key={m.label} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3">
                <p className="truncate text-xs text-zinc-700">{m.label}</p>
                <div className="h-2 overflow-hidden rounded-sm bg-zinc-100">
                  <div
                    className="h-full rounded-sm bg-gradient-to-r from-blue-600 to-blue-400"
                    style={{ width: `${m.value}%` }}
                  />
                </div>
                <p className="text-right text-[0.6875rem] tabular-nums text-zinc-500">
                  {Math.round((m.value / 100) * 14)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white px-5 py-5">
          <p className="text-[0.6875rem] tracking-wider text-zinc-500 uppercase">
            Enquiries by channel
          </p>
          <div className="mt-5 flex items-center gap-6">
            <div className="relative size-32 shrink-0 rounded-full" style={{ background: conic }}>
              <div className="absolute inset-3 rounded-full bg-white" />
            </div>
            <ul className="flex-1 space-y-3 text-xs">
              {CHANNELS.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${c.color}`} aria-hidden="true" />
                    <span className="text-zinc-700">{c.label}</span>
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className="text-zinc-900">{c.value}</span>
                    <span className="text-zinc-500">{c.pct}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-zinc-200/80 lg:grid-cols-4 border-t border-zinc-200/80">
        <Status label="Open" value={<NumberTick value={open} format={fmtInt} />} tone="blue" />
        <Status label="Progressed" value="5" tone="violet" />
        <Status label="Closed" value="21" tone="emerald" />
        <Status label="Lost" value="5" tone="rose" />
      </div>

      <div className="bg-white">
        <div className="flex items-center justify-between border-y border-zinc-200/80 px-5 py-3">
          <p className="text-[0.6875rem] tracking-wider text-zinc-500 uppercase">
            Live enquiry log
          </p>
          <p className="text-[0.6875rem] text-zinc-500">
            <NumberTick value={recentRows.length} format={fmtInt} /> most recent
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-xs">
            <thead>
              <tr className="text-[0.6875rem] tracking-wider text-zinc-500 uppercase">
                <Th>Date &amp; time</Th>
                <Th>Channel</Th>
                <Th>Matter type</Th>
                <Th>Qualification</Th>
                <Th>Booking</Th>
                <Th>Fee earner</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {recentRows.map((r) => (
                  <motion.tr
                    key={`${r.date}::${r.matter}`}
                    initial={{
                      opacity: 0,
                      backgroundColor: "rgba(59, 130, 246, 0.12)",
                    }}
                    animate={{
                      opacity: 1,
                      backgroundColor: "rgba(59, 130, 246, 0)",
                    }}
                    transition={{
                      opacity: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                      backgroundColor: {
                        duration: 2.6,
                        delay: 0.4,
                        ease: "easeOut",
                      },
                    }}
                    className="border-t border-zinc-100 text-zinc-700"
                  >
                    <Td className="tabular-nums text-zinc-500">
                      {r.isNew && <PingDot />}
                      {r.date}
                    </Td>
                    <Td>{r.channel}</Td>
                    <Td>{r.matter}</Td>
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-medium uppercase ring-1 ring-inset ${QUAL_TONE[r.qual]}`}
                      >
                        {r.qual}
                      </span>
                    </Td>
                    <Td className={BOOKING_TONE[r.booking]}>{r.booking}</Td>
                    <Td className="text-zinc-500">{r.earner}</Td>
                    <Td className={STATUS_TONE[r.status]}>{r.status}</Td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-white px-5 py-5">
      <p className="text-[0.6875rem] tracking-wider text-zinc-500 uppercase">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums lg:text-4xl ${accent ?? "text-zinc-900"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[0.6875rem] text-zinc-500">{sub}</p>
    </div>
  );
}

const STATUS_TONES = {
  blue: { dot: "bg-blue-600", text: "text-blue-600" },
  violet: { dot: "bg-violet-600", text: "text-violet-600" },
  emerald: { dot: "bg-emerald-600", text: "text-emerald-700" },
  rose: { dot: "bg-rose-600", text: "text-rose-700" },
} as const;

function Status({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: keyof typeof STATUS_TONES;
}) {
  const t = STATUS_TONES[tone];
  return (
    <div className="bg-white px-5 py-4">
      <div className="flex items-center gap-2">
        <span className={`size-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
        <p className="text-[0.6875rem] tracking-wider text-zinc-500 uppercase">{label}</p>
      </div>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums lg:text-3xl ${t.text}`}
      >
        {value}
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3 font-medium">{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-3 ${className ?? ""}`}>{children}</td>;
}
