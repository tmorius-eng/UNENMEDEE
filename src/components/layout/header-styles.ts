/**
 * Round outlined icon button, the header's one control shape (search, 🔔, Tт, theme, menu).
 * Its own module: the client toggles import it and must not pull site-header.tsx (server queries).
 */
export const HEADER_ICON_BUTTON =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-tertiary ring-1 ring-line ring-inset transition hover:bg-primary_hover hover:text-fg-primary sm:size-10";
