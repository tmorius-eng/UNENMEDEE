import { Response } from "@/components/ui/response";

import { AIMessage } from "./ai-message";

/** An AI block whose body is Markdown (Grok analysis, cluster synthesis), rendered by streamdown. */
export function AIMarkdownMessage({ tier, title, markdown }: { tier: "tier1" | "tier2"; title: string; markdown: string }) {
  return (
    <AIMessage tier={tier} title={title}>
      <Response className="prose prose-sm max-w-none text-secondary dark:prose-invert">{markdown}</Response>
    </AIMessage>
  );
}
