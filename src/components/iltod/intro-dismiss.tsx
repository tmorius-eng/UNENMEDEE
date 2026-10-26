"use client";

/** "Ойлголоо": remembers the choice and hides the strip at once (the same attribute the layout script sets). */
export function IntroDismiss({ storageKey }: { storageKey: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.setItem(storageKey, "1");
        } catch {
          /* storage blocked: hidden for this page view only */
        }
        document.documentElement.dataset.intro = "seen";
      }}
      className="cursor-pointer rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-bg-primary hover:opacity-90"
    >
      Ойлголоо
    </button>
  );
}
