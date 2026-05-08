import { defineOgTemplate } from "@jxdltd/tanstack/og";

export default defineOgTemplate({
  width: 1200,
  height: 630,
  fonts: [],
  render: ({ data }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 64,
        background: "#fff",
        fontFamily: "Plus Jakarta Sans",
      }}
    >
      <span style={{ fontSize: 24, color: "#888" }}>auvia.io</span>
      <h1
        style={{
          fontSize: 72,
          fontWeight: 700,
          marginTop: "auto",
          color: "#0a0a0a",
        }}
      >
        {data.title}
      </h1>
      {data.description ? (
        <p style={{ fontSize: 28, color: "#555", marginTop: 16 }}>{data.description}</p>
      ) : null}
      {data.type === "article" && data.author ? (
        <span style={{ fontSize: 22, color: "#888", marginTop: 16 }}>
          {data.author}
          {data.date ? ` · ${data.date}` : null}
        </span>
      ) : null}
    </div>
  ),
});
