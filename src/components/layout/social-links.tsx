import { SOCIAL } from "@/lib/site";
import { cx } from "@/utils/cx";

/**
 * The site's Facebook, Instagram, Threads, Messenger and RSS as round brand-coloured buttons. Plain
 * markup with inline SVG (no icon library, no client JS), so it can sit in the header on every page.
 */
export type SocialKey = "facebook" | "instagram" | "threads" | "messenger" | "rss";

const ITEMS: Record<SocialKey, { label: string; href: string; bg: string; icon: React.ReactNode }> = {
  facebook: {
    label: "Facebook",
    href: SOCIAL.facebook,
    bg: "bg-[#1877f2]",
    icon: <path fill="#fff" d="M13.4 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.7v3h2.6V21h3.1z" />,
  },
  instagram: {
    label: "Instagram",
    href: SOCIAL.instagram,
    bg: "bg-[radial-gradient(circle_at_30%_110%,#fdf497_0%,#fd5949_45%,#d6249f_60%,#285aeb_95%)]",
    icon: (
      <g fill="none" stroke="#fff" strokeWidth="1.8">
        <rect x="5.5" y="5.5" width="13" height="13" rx="4" />
        <circle cx="12" cy="12" r="3.1" />
        <circle cx="16" cy="8" r=".6" fill="#fff" stroke="none" />
      </g>
    ),
  },
  threads: {
    label: "Threads",
    href: SOCIAL.threads,
    bg: "bg-[#101010] ring-1 ring-white/15",
    icon: (
      <text x="12" y="16.6" textAnchor="middle" fontSize="14.5" fontWeight="700" fill="#fff" fontFamily="inherit">
        @
      </text>
    ),
  },
  messenger: {
    label: "Messenger",
    href: SOCIAL.messenger,
    bg: "bg-[linear-gradient(135deg,#00b2ff_0%,#a033ff_60%,#ff5c87_100%)]",
    icon: (
      <>
        <path fill="#fff" d="M12 4.5c-4.3 0-7.5 3.1-7.5 7.1 0 2.1.9 3.9 2.4 5.2v2.7l2.4-1.3c.8.2 1.7.4 2.7.4 4.3 0 7.5-3.1 7.5-7S16.3 4.5 12 4.5z" />
        <path fill="#7b3cff" d="m7.9 13.9 2.6-4 2 1.6 2.5-1.6-2.6 4-2-1.6z" />
      </>
    ),
  },
  rss: {
    label: "RSS",
    href: "/feed.xml",
    bg: "bg-[#f26522]",
    icon: (
      <g fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round">
        <circle cx="7.6" cy="16.4" r="1.5" fill="#fff" stroke="none" />
        <path d="M6.3 11.2a6.5 6.5 0 0 1 6.5 6.5M6.3 6.6a11.1 11.1 0 0 1 11.1 11.1" />
      </g>
    ),
  },
};

export const ALL_SOCIAL: SocialKey[] = ["facebook", "instagram", "threads", "messenger", "rss"];

export function SocialLinks({ only = ALL_SOCIAL, size = "md", labels = false, className }: { only?: SocialKey[]; size?: "xs" | "sm" | "md" | "lg"; labels?: boolean; className?: string }) {
  const box = size === "xs" ? "size-6" : size === "sm" ? "size-7" : size === "md" ? "size-8" : "size-10";
  return (
    <ul className={cx("flex items-center", labels ? "flex-wrap gap-3" : size === "xs" ? "gap-1" : "gap-1.5", className)}>
      {only.map((key) => {
        const it = ITEMS[key];
        const external = key !== "rss";
        return (
          <li key={key}>
            <a
              href={it.href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer me" } : { type: "application/rss+xml" })}
              aria-label={labels ? undefined : `ИЛ ТОД МЭДЭЭ ${it.label}`}
              title={it.label}
              className={cx("group flex items-center gap-2 rounded-full outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2", labels && "pr-3 text-sm font-semibold text-secondary hover:text-primary")}
            >
              <span className={cx(box, it.bg, "flex shrink-0 items-center justify-center rounded-full shadow-xs transition duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md")}>
                <svg viewBox="0 0 24 24" aria-hidden className="size-[70%]">
                  {it.icon}
                </svg>
              </span>
              {labels && it.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
