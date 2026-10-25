"use client";

/**
 * The root layout itself failed. It replaces the whole document, so it carries its own minimal
 * markup and inline styles (global CSS and fonts are not loaded here).
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="mn">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#101828" }}>
        <title>Түр алдаа · ИЛ ТОД МЭДЭЭ</title>
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22 }}>Түр алдаа гарлаа</h1>
          <p style={{ color: "#475467" }}>Сайт түр ажиллахгүй байна. Хэсэг хугацааны дараа дахин оролдоно уу.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, border: 0, background: "#047c78", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Дахин оролдох
          </button>
        </main>
      </body>
    </html>
  );
}
