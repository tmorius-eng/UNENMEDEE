"use client";

import dynamic from "next/dynamic";

// three.js is heavy and needs WebGL: load it only in the browser, after the page is interactive.
const Orb = dynamic(() => import("@/components/ui/orb").then((m) => m.Orb), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse rounded-full bg-brand-secondary" />,
});

export function OrbAccent({ state = null, className }: { state?: null | "thinking" | "listening" | "talking"; className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Orb colors={["#93C5FD", "#C4B5FD"]} agentState={state} />
    </div>
  );
}
