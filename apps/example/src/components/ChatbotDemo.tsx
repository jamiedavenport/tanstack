import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircleIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";

const SCRIPT = {
  greeting:
    "Hi, welcome to Hargrove & Co. Solicitors! Could you walk me through what you need help with today?",
  visitor1: "Hi yes, I was injured at work three months ago and I'm not sure if I have a claim.",
  auvia1:
    "Sorry to hear that. Was the accident reported to your employer, and do you currently have a solicitor handling this?",
  visitor2: "Yes it was reported. No solicitor yet, I wasn't sure where to start.",
  pickerIntro:
    "That's helpful, thank you. Here are some times this week with one of our personal injury solicitors:",
  confirmation: "Booked: Thursday 8 May at 10:00 AM. A confirmation is on its way to your email.",
};

const SLOTS = [
  { day: "Wed", date: "May 7", time: "11:00 AM" },
  { day: "Wed", date: "May 7", time: "3:00 PM" },
  { day: "Thu", date: "May 8", time: "10:00 AM" },
  { day: "Thu", date: "May 8", time: "2:30 PM" },
];
const SELECTED_INDEX = 2;

const DAYS = [
  { short: "Mon", date: "4" },
  { short: "Tue", date: "5" },
  { short: "Wed", date: "6" },
  { short: "Thu", date: "7" },
  { short: "Fri", date: "8" },
];

const HOURS = ["9", "10", "11", "12", "1", "2", "3", "4"];
const TOTAL_MIN = HOURS.length * 60;

const BG_EVENTS: {
  day: number;
  startMin: number;
  dur: number;
  label: string;
}[] = [
  { day: 0, startMin: 30, dur: 60, label: "Client intake review" },
  { day: 0, startMin: 360, dur: 30, label: "Mediation · Patel" },
  { day: 1, startMin: 90, dur: 30, label: "1:1 · Lana" },
  { day: 2, startMin: 60, dur: 60, label: "Initial consult" },
  { day: 2, startMin: 270, dur: 45, label: "File review" },
  { day: 3, startMin: 180, dur: 60, label: "Patel matter follow-up" },
  { day: 4, startMin: 0, dur: 30, label: "Team standup" },
  { day: 4, startMin: 240, dur: 60, label: "Court prep" },
];

const BOOKING = { day: 3, startMin: 60, dur: 30 };

const TIMELINE: { phase: number; delay: number }[] = [
  { phase: 1, delay: 1500 },
  { phase: 2, delay: 2400 },
  { phase: 3, delay: 2200 },
  { phase: 4, delay: 4500 },
  { phase: 5, delay: 2200 },
  { phase: 6, delay: 2200 },
  { phase: 7, delay: 2400 },
  { phase: 8, delay: 1400 },
  { phase: 9, delay: 1800 },
  { phase: 10, delay: 700 },
];

function useTimeline() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let id: ReturnType<typeof setTimeout> | null = null;
    let i = 0;
    const tick = () => {
      if (cancelled || i >= TIMELINE.length) return;
      const step = TIMELINE[i];
      id = setTimeout(() => {
        if (cancelled) return;
        setPhase(step.phase);
        i++;
        tick();
      }, step.delay);
    };
    tick();
    return () => {
      cancelled = true;
      if (id) clearTimeout(id);
    };
  }, []);
  return phase;
}

export function ChatbotDemo() {
  const phase = useTimeline();
  return (
    <div className="relative isolate mx-auto mt-20 w-full max-w-5xl lg:aspect-[16/10]">
      <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-8">
        <ChatPanel phase={phase} />
        <CalendarPanel phase={phase} />
      </div>
    </div>
  );
}

function ChatPanel({ phase }: { phase: number }) {
  return (
    <div className="flex h-[460px] flex-col overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-950/5 shadow-2xl shadow-zinc-300/40 lg:h-full">
      <div className="flex items-center gap-3 border-b border-zinc-950/5 bg-white px-5 py-4">
        <div className="relative">
          <div className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-sm shadow-blue-600/30">
            H
          </div>
          <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold leading-tight">Hargrove &amp; Co. Solicitors</p>
          <p className="text-xs leading-tight text-zinc-500">Client intake · Online</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-end gap-2.5 overflow-hidden px-4 py-5">
        <AnimatePresence initial={false} mode="popLayout">
          <Bubble key="greet" from="auvia">
            {SCRIPT.greeting}
          </Bubble>
          {phase >= 1 && (
            <Bubble key="v1" from="visitor">
              {SCRIPT.visitor1}
            </Bubble>
          )}
          {phase === 2 && <Typing key="t1" />}
          {phase >= 3 && (
            <Bubble key="a1" from="auvia">
              {SCRIPT.auvia1}
            </Bubble>
          )}
          {phase >= 4 && (
            <Bubble key="v2" from="visitor">
              {SCRIPT.visitor2}
            </Bubble>
          )}
          {phase === 5 && <Typing key="t2" />}
          {phase >= 6 && phase < 8 && (
            <Bubble key="pi" from="auvia">
              {SCRIPT.pickerIntro}
            </Bubble>
          )}
          {phase >= 6 && phase < 8 && <PickerBubble key="pk" highlight={phase >= 7} />}
          {phase >= 9 && (
            <Bubble key="conf" from="auvia">
              {SCRIPT.confirmation}
            </Bubble>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-zinc-950/5 bg-white px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-zinc-100 pr-1.5 pl-4">
          <p className="flex-1 py-2 text-sm text-zinc-600">Message Hargrove &amp; Co.…</p>
          <button
            type="button"
            aria-label="Send"
            className="grid size-7 place-items-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/30"
          >
            <PaperPlaneTiltIcon weight="fill" className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ from, children }: { from: "visitor" | "auvia"; children: React.ReactNode }) {
  const isVisitor = from === "visitor";
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{
        layout: { type: "spring", stiffness: 240, damping: 30 },
        opacity: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
      }}
      className={isVisitor ? "max-w-[85%] self-end" : "max-w-[85%] self-start"}
    >
      <div
        className={
          isVisitor
            ? "rounded-2xl rounded-br-md bg-zinc-900 px-3.5 py-2 text-right text-sm text-white"
            : "rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-left text-sm text-zinc-900 ring-1 ring-zinc-950/8"
        }
      >
        {children}
      </div>
    </motion.div>
  );
}

function Typing() {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{
        layout: { type: "spring", stiffness: 240, damping: 30 },
        opacity: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
      }}
      className="self-start"
    >
      <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 ring-1 ring-zinc-950/8">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-zinc-400"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function PickerBubble({ highlight }: { highlight: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{
        layout: { type: "spring", stiffness: 240, damping: 30 },
        opacity: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
      }}
      className="w-full max-w-[88%] self-start"
    >
      <div className="rounded-2xl rounded-bl-md bg-white p-2.5 ring-1 ring-zinc-950/8">
        <div className="flex items-center justify-between px-1.5 pt-1 pb-2">
          <p className="text-[0.6875rem] font-medium tracking-wide text-zinc-500 uppercase">
            Available · 30 min
          </p>
          <p className="text-[0.6875rem] text-zinc-500">BST</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {SLOTS.map((s, i) => {
            const selected = i === SELECTED_INDEX && highlight;
            if (selected) {
              return (
                <motion.div
                  key="sel"
                  layoutId="booking"
                  initial={{ scale: 0.92 }}
                  animate={{ scale: 1 }}
                  transition={{
                    layout: {
                      type: "spring",
                      stiffness: 220,
                      damping: 26,
                    },
                    scale: {
                      type: "spring",
                      stiffness: 420,
                      damping: 22,
                    },
                  }}
                  className="rounded-lg bg-blue-600 px-2.5 py-2 shadow-sm shadow-blue-600/30"
                >
                  <motion.p
                    layout="position"
                    className="text-[0.6875rem] font-medium tracking-wide text-blue-100 uppercase"
                  >
                    {s.day} · {s.date}
                  </motion.p>
                  <motion.p
                    layout="position"
                    className="mt-1 text-sm font-semibold tabular-nums text-white"
                  >
                    {s.time}
                  </motion.p>
                </motion.div>
              );
            }
            return (
              <div key={i} className="rounded-lg bg-zinc-50 px-2.5 py-2 ring-1 ring-zinc-950/5">
                <p className="text-[0.6875rem] font-medium tracking-wide text-zinc-500 uppercase">
                  {s.day} · {s.date}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">{s.time}</p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function CalendarPanel({ phase }: { phase: number }) {
  const upcomingFocus = phase >= 7;
  return (
    <div className="relative flex h-[480px] flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-950/5 shadow-2xl shadow-zinc-300/40 lg:h-full">
      <div className="flex items-center justify-between border-b border-zinc-950/5 px-5 py-4">
        <div className="text-left">
          <p className="text-sm font-semibold leading-tight">May 2026</p>
          <p className="text-xs leading-tight text-zinc-500">Week of May 4</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <p className="text-xs text-zinc-500">Synced · Google Calendar</p>
        </div>
      </div>

      <div className="grid grid-cols-[2.5rem_repeat(5,minmax(0,1fr))] border-b border-zinc-950/5 bg-white">
        <div />
        {DAYS.map((d, i) => {
          const isFocus = i === BOOKING.day && upcomingFocus;
          return (
            <div key={d.short} className="relative px-2 py-2.5 text-center">
              <AnimatePresence>
                {isFocus && (
                  <motion.span
                    key="focus"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="pointer-events-none absolute inset-x-1 inset-y-1 rounded-md bg-blue-50"
                  />
                )}
              </AnimatePresence>
              <p className="relative text-[0.6875rem] font-medium tracking-wide text-zinc-500 uppercase">
                {d.short}
              </p>
              <p
                className={
                  isFocus
                    ? "relative mt-0.5 text-sm font-semibold tabular-nums text-blue-700"
                    : "relative mt-0.5 text-sm font-semibold tabular-nums text-zinc-900"
                }
              >
                {d.date}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid flex-1 grid-cols-[2.5rem_repeat(5,minmax(0,1fr))]">
        <div className="relative border-r border-zinc-950/5">
          {HOURS.map((h, i) => (
            <p
              key={h}
              className="absolute right-1.5 -translate-y-1/2 text-[0.6875rem] tabular-nums text-zinc-500"
              style={{ top: `${(i / HOURS.length) * 100}%` }}
            >
              {h}
              {i === 0 ? " AM" : i === 3 ? " PM" : ""}
            </p>
          ))}
        </div>
        {DAYS.map((_, dayIdx) => (
          <div key={dayIdx} className="relative border-r border-zinc-950/5 last:border-r-0">
            {HOURS.map((_, i) =>
              i === 0 ? null : (
                <div
                  key={i}
                  className="pointer-events-none absolute inset-x-0 border-t border-zinc-950/5"
                  style={{ top: `${(i / HOURS.length) * 100}%` }}
                />
              ),
            )}
            {BG_EVENTS.filter((e) => e.day === dayIdx).map((e, i) => (
              <div
                key={i}
                className="absolute inset-x-1 overflow-hidden rounded-md bg-zinc-100 px-1.5 py-1 ring-1 ring-zinc-950/5"
                style={{
                  top: `${(e.startMin / TOTAL_MIN) * 100}%`,
                  height: `${(e.dur / TOTAL_MIN) * 100}%`,
                }}
              >
                <p className="truncate text-[0.6875rem] leading-tight font-medium text-zinc-600">
                  {e.label}
                </p>
              </div>
            ))}
            {dayIdx === BOOKING.day && (
              <AnimatePresence>
                {phase >= 8 && (
                  <motion.div
                    key="booked"
                    layoutId="booking"
                    exit={{
                      opacity: 0,
                      scale: 0.92,
                      transition: { duration: 0.25 },
                    }}
                    transition={{
                      layout: {
                        type: "spring",
                        stiffness: 220,
                        damping: 26,
                      },
                    }}
                    className="absolute inset-x-1 z-10 overflow-hidden rounded-md bg-blue-600 px-1.5 py-1 shadow-md shadow-blue-600/30 ring-1 ring-blue-700/20"
                    style={{
                      top: `${(BOOKING.startMin / TOTAL_MIN) * 100}%`,
                      height: `${(BOOKING.dur / TOTAL_MIN) * 100}%`,
                    }}
                  >
                    <motion.p
                      layout="position"
                      className="truncate text-[0.6875rem] leading-tight font-semibold text-white"
                    >
                      Personal injury · new client
                    </motion.p>
                    <motion.p
                      layout="position"
                      className="truncate text-[0.6875rem] leading-tight text-blue-100"
                    >
                      10:00 – 10:30 AM
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            {dayIdx === BOOKING.day && (
              <AnimatePresence>
                {phase >= 8 && phase <= 9 && (
                  <motion.div
                    key="ping"
                    initial={{ opacity: 0.55, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                    className="pointer-events-none absolute inset-x-1 z-0 rounded-md ring-2 ring-blue-500"
                    style={{
                      top: `${(BOOKING.startMin / TOTAL_MIN) * 100}%`,
                      height: `${(BOOKING.dur / TOTAL_MIN) * 100}%`,
                    }}
                  />
                )}
              </AnimatePresence>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {phase >= 10 && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg shadow-zinc-900/15"
          >
            <CheckCircleIcon weight="fill" className="size-3.5 text-emerald-400" />
            <span>Meeting booked · invite sent</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
