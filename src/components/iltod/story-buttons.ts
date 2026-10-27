import { cx } from "@/utils/cx";

/** Action buttons under an opened story (home StoryList, /digest, the article page). */
export const STORY_BUTTON = "flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition";
export const STORY_BUTTON_PRIMARY = cx(STORY_BUTTON, "bg-ink text-bg-primary hover:opacity-90");
export const STORY_BUTTON_OUTLINE = cx(STORY_BUTTON, "text-secondary ring-1 ring-line ring-inset hover:bg-primary_hover hover:text-primary");
