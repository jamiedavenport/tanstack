import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineOgTemplate, type OgTemplateFont } from "@jxdltd/tanstack/og";

const sansFont = (file: string) =>
  readFileSync(join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans", file));

function loadFonts(): OgTemplateFont[] {
  return [
    { name: "Geist", data: sansFont("Geist-Regular.ttf"), weight: 400, style: "normal" },
    { name: "Geist", data: sansFont("Geist-Medium.ttf"), weight: 500, style: "normal" },
    { name: "Geist", data: sansFont("Geist-Black.ttf"), weight: 900, style: "normal" },
  ];
}

const INK = "#18181b";
const CANVAS = "#ffffff";
const MUTE = "#71717a";
const ACCENT = "#2563eb";
const PAD = 72;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: CANVAS,
        display: "flex",
        flexDirection: "column",
        padding: PAD,
        fontFamily: "Geist",
        color: INK,
      }}
    >
      {children}
    </div>
  );
}

function Wordmark() {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "Geist",
        fontWeight: 900,
        fontSize: 22,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: INK,
      }}
    >
      Auvia
    </div>
  );
}

function Eyebrow({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 14,
        color: ACCENT,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        fontWeight: 500,
      }}
    >
      {text}
    </div>
  );
}

function Underline({ width }: { width: number }) {
  return (
    <svg
      width={width}
      height={14}
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      style={{ position: "absolute", left: 0, bottom: -10 }}
    >
      <path
        d="M3 9 C 60 1 110 14 197 6"
        stroke={ACCENT}
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function titleSize(text: string) {
  if (text.length > 80) return 52;
  if (text.length > 60) return 60;
  if (text.length > 40) return 70;
  return 80;
}

function splitForAccent(title: string): { before: string; accent: string | null } {
  const trailingDot = title.endsWith(".") ? "." : "";
  const trimmed = trailingDot ? title.slice(0, -1) : title;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 4) return { before: title, accent: null };
  const tailCount = words.length > 8 ? 2 : 1;
  const accentWords = words.slice(-tailCount);
  const beforeWords = words.slice(0, -tailCount);
  return {
    before: beforeWords.join(" "),
    accent: accentWords.join(" ") + trailingDot,
  };
}

function PageCard({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  const size = titleSize(title);
  const { before, accent } = splitForAccent(title);
  return (
    <Frame>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark />
        {eyebrow ? <Eyebrow text={eyebrow} /> : <div style={{ display: "flex" }} />}
      </div>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: size,
            lineHeight: 1.05,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: INK,
            maxWidth: 1000,
          }}
        >
          <span style={{ display: "flex", paddingRight: accent ? "0.28em" : 0 }}>{before}</span>
          {accent ? (
            <span style={{ position: "relative", display: "flex", color: ACCENT }}>
              {accent}
              <Underline width={accent.length * size * 0.45} />
            </span>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 18,
            color: MUTE,
            maxWidth: 900,
          }}
        >
          {footer}
        </div>
      </div>
    </Frame>
  );
}

function PostCard({
  tag,
  title,
  author,
  date,
}: {
  tag: string;
  title: string;
  author: string;
  date: string;
}) {
  const size = titleSize(title);
  return (
    <Frame>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark />
        {tag ? <Eyebrow text={tag} /> : <div style={{ display: "flex" }} />}
      </div>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: size,
            lineHeight: 1.05,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: INK,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 18,
            color: MUTE,
            gap: 14,
          }}
        >
          {author ? <span style={{ display: "flex" }}>{author}</span> : null}
          {author && date ? <span style={{ display: "flex", color: "#d4d4d8" }}>·</span> : null}
          {date ? <span style={{ display: "flex" }}>{date}</span> : null}
        </div>
      </div>
    </Frame>
  );
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

export default defineOgTemplate({
  width: 1200,
  height: 630,
  fonts: loadFonts,
  render: ({ data }) => {
    if (data.type === "article") {
      return (
        <PostCard
          tag={(data.tag ?? "post").toUpperCase()}
          title={data.title}
          author={data.author ?? ""}
          date={formatDate(data.date)}
        />
      );
    }
    return (
      <PageCard
        eyebrow={(data.tag ?? "").toUpperCase()}
        title={data.title}
        footer={data.description ?? ""}
      />
    );
  },
});
