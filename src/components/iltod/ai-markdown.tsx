import { AIMessage } from "./ai-message";
import { AIMarkdownBody } from "./ai-markdown-body";

/** An AI block whose body is Markdown (Grok analysis, cluster synthesis), rendered by streamdown. */
export function AIMarkdownMessage({ tier, title, note, markdown, className }: { tier: "tier1" | "tier2"; title: string; note?: React.ReactNode; markdown: string; className?: string }) {
  return (
    <AIMessage tier={tier} title={title} note={note} className={className}>
      <AIMarkdownBody markdown={markdown} />
    </AIMessage>
  );
}
