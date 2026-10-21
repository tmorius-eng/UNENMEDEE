import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";

/**
 * Every AI-generated block renders as an ElevenLabs UI <Message> so readers can always
 * tell machine analysis apart from the government's original text. Markdown bodies go through
 * `AIMarkdownMessage` (ai-markdown.tsx): streamdown is large, so this file must not import it
 * (the home page's StoryList ships AIMessage to the browser).
 */
export function AIMessage({
  tier,
  title,
  children,
  compact = false,
}: {
  tier: "tier1" | "tier2";
  title: string;
  children?: React.ReactNode;
  /** Full width, no avatar column (inline summaries in the story list on phones). */
  compact?: boolean;
}) {
  return (
    <Message from="assistant" className="py-2">
      <MessageContent variant="contained" className="max-w-full flex-1 px-5 py-4">
        <p className="text-xs font-semibold tracking-wide text-tertiary uppercase">{title}</p>
        {children}
      </MessageContent>
      {!compact && <MessageAvatar src={tier === "tier2" ? "/avatars/ai-tier2.svg" : "/avatars/ai-tier1.svg"} name="AI" />}
    </Message>
  );
}
