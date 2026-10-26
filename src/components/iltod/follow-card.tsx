import Link from "next/link";

import { SocialLinks } from "@/components/layout/social-links";

/** End-of-story invitation to follow (server markup, no client JS): where the reader already is. */
export function FollowCard() {
  return (
    <aside className="flex flex-col gap-3 rounded-2xl bg-secondary p-4 ring-1 ring-line-soft ring-inset">
      <div>
        <p className="text-md font-semibold text-primary">Төрийн хамгийн чухал мэдээг өдөр бүр авах уу?</p>
        <p className="text-sm text-tertiary">
          Өглөө, оройн{" "}
          <Link href="/digest" prefetch={false} className="font-semibold text-brand-secondary hover:underline">
            тойм
          </Link>{" "}
          болон эрсдэлтэй мэдээг доорх сувгуудаар хүргэнэ. Мэдэгдэл авах бол дээд талын 🔔-ийг дарна уу.
        </p>
      </div>
      <SocialLinks size="md" labels />
    </aside>
  );
}
