"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
            Что-то пошло не так
          </h1>
          <p style={{ color: "#737373", marginTop: 8, fontSize: 14 }}>
            Перезапусти приложение или попробуй чуть позже.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              height: 44,
              padding: "0 20px",
              borderRadius: 12,
              border: "none",
              background: "#22c55e",
              color: "#000",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            Перезагрузить
          </button>
        </div>
      </body>
    </html>
  );
}
