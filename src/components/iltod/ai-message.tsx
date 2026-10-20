import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import { Response } from "@/components/ui/response";

/**
 * Every AI-generated block renders as an ElevenLabs UI <Message> so readers can always
 * tell machine analysis apart from the government's original text.
 */
export function AIMessage({
  tier,
  title,
  children,
  markdown,
}: {
  tier: "tier1" | "tier2";
  title: string;
  children?: React.ReactNode;
  markdown?: string;
}) {
  return (
    <Message from="assistant" className="py-2">
      <MessageContent variant="contained" className="max-w-full flex-1 px-5 py-4">
        <p className="text-xs font-semibold tracking-wide text-tertiary uppercase">{title}</p>
        {markdown ? <Response className="prose prose-sm max-w-none text-secondary dark:prose-invert">{markdown}</Response> : children}
      </MessageContent>
      <MessageAvatar src={tier === "tier2" ? "/avatars/ai-tier2.svg" : "/avatars/ai-tier1.svg"} name={tier === "tier2" ? "Gk" : "DS"} />
    </Message>
  );
}
