"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // No next-intl context here (root boundary) — detect locale from the URL path.
  const tm =
    typeof window !== "undefined" && window.location.pathname.startsWith("/tm");
  const txt = tm
    ? {
        title: "Bir zat ýalňyş geçdi",
        sub: "Programmany täzeden işlet ýa-da birsalymdan synanyş.",
        reload: "Täzeden ýükle",
      }
    : {
        title: "Что-то пошло не так",
        sub: "Перезапусти приложение или попробуй чуть позже.",
        reload: "Перезагрузить",
      };
  return (
    <html>
      <body
        style={{
          background: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100dvh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 48 }}>⚽</div>
          <h1 style={{ fontWeight: 800, fontSize: 22, marginTop: 12 }}>
            {txt.title}
          </h1>
          <p style={{ color: "#737373", marginTop: 8, fontSize: 14 }}>
            {txt.sub}
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              height: 44,
              padding: "0 20px",
              borderRadius: 12,
              border: "none",
              background: "#1FD16B",
              color: "#000",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {txt.reload}
          </button>
        </div>
      </body>
    </html>
  );
}
