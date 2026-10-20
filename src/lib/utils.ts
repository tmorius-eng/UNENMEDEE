import { cx } from "@/utils/cx";

/**
 * shadcn-style `cn()` used by the vendored ElevenLabs UI components.
 * Delegates to Untitled UI's tailwind-merge config so both libraries merge classes identically.
 */
export function cn(...classes: Parameters<typeof cx>): string {
  return cx(...classes);
}
