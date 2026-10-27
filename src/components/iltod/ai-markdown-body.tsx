"use client";

import dynamic from "next/dynamic";

/**
 * streamdown (Markdown parser + HTML tokenizer, ~140 KB gzip) as its own async chunk. Imported
 * directly, it shipped on every article page, deep analysis or not (PageSpeed, Oct 2026); a
 * Server Component's dynamic import is not code-split, so the split lives in this client file.
 * SSR stays on: the HTML is server-rendered and the chunk loads only where a block renders.
 */
const Response = dynamic(() => import("@/components/ui/response").then((m) => m.Response));

export function AIMarkdownBody({ markdown }: { markdown: string }) {
  return <Response className="prose max-w-none text-secondary">{markdown}</Response>;
}
