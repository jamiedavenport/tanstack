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

function splitForAccent(title: string): {
  before: string;
  accent: string | null;
} {
  // Pull the last 1-2 words out as the accent target so the underline
  // lands somewhere that reads as a hook ("missed enquiries", etc.).
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

export type PageCardProps = {
  eyebrow: string;
  title: string;
  footer: string;
};

export function pageCard({ eyebrow, title, footer }: PageCardProps) {
  const size = titleSize(title);
  const { before, accent } = splitForAccent(title);
  return (
    <Frame>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Wordmark />
        {eyebrow ? <Eyebrow text={eyebrow} /> : <div style={{ display: "flex" }} />}
      </div>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
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
          <span
            style={{
              display: "flex",
              paddingRight: accent ? "0.28em" : 0,
            }}
          >
            {before}
          </span>
          {accent ? (
            <span
              style={{
                position: "relative",
                display: "flex",
                color: ACCENT,
              }}
            >
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

export type PostCardProps = {
  tag: string;
  title: string;
  author: string;
  date: string;
  readingTime: string;
};

export function postCard({ tag, title, author, date, readingTime }: PostCardProps) {
  const size = titleSize(title);
  return (
    <Frame>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Wordmark />
        {tag ? <Eyebrow text={tag} /> : <div style={{ display: "flex" }} />}
      </div>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
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
          <span style={{ display: "flex" }}>{author}</span>
          <span style={{ display: "flex", color: "#d4d4d8" }}>·</span>
          <span style={{ display: "flex" }}>{date}</span>
          {readingTime ? (
            <>
              <span style={{ display: "flex", color: "#d4d4d8" }}>·</span>
              <span style={{ display: "flex" }}>{readingTime}</span>
            </>
          ) : null}
        </div>
      </div>
    </Frame>
  );
}
