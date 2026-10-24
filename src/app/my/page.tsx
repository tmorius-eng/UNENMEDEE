import type { Metadata } from "next";

import { MyFeed } from "@/components/iltod/my-feed";
import { TopicBar } from "@/components/iltod/topic-bar";

export const metadata: Metadata = {
  title: "Миний мэдээ",
  alternates: { canonical: "/my" },
  description: "Таны дагасан сэдвүүдийн шинэ мэдээ нэг урсгалд.",
  robots: { index: false, follow: true },
};

export default function MyPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-20 md:pb-0">
      <header className="pb-2">
        <h1 className="text-display-xs font-semibold tracking-tight text-primary md:text-display-sm">⭐ Миний мэдээ</h1>
        <span aria-hidden className="mt-2 block h-1 w-12 rounded-full bg-brand-solid" />
      </header>
      <TopicBar active="my" placement="inline" />
      <MyFeed />
      <TopicBar active="my" placement="bottom" />
    </div>
  );
}
