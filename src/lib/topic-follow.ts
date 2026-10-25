import { PLACES } from "@/lib/places";
import { TOPICS } from "@/lib/topics";

/**
 * Topics and places (aimag, district) a reader follows ("Миний мэдээ", /my). Browser-only, in
 * localStorage. No zod or push imports here: the follow button ships on every topic and place page.
 */
export const TOPIC_FOLLOW_KEY = "iltod-topics";
export const FOLLOWABLE_TOPICS = TOPICS.map((t) => t.key);

export function isFollowableTopic(key: string): boolean {
  return FOLLOWABLE_TOPICS.includes(key);
}

export const PLACE_FOLLOW_KEY = "iltod-places";
const PLACE_SLUGS = new Set(PLACES.map((p) => p.slug));

export function isFollowablePlace(slug: string): boolean {
  return PLACE_SLUGS.has(slug);
}

/** Known keys only, no duplicates, in the stored order. */
function parseFollows(raw: string | null | undefined, known: (key: string) => boolean): string[] {
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? [...new Set(v.filter((k): k is string => typeof k === "string" && known(k)))] : [];
  } catch {
    return [];
  }
}

export function parseTopicFollows(raw: string | null | undefined): string[] {
  return parseFollows(raw, isFollowableTopic);
}

export function parsePlaceFollows(raw: string | null | undefined): string[] {
  return parseFollows(raw, isFollowablePlace);
}

export function toggleTopicFollow(follows: string[], key: string): string[] {
  return follows.includes(key) ? follows.filter((k) => k !== key) : [...follows, key];
}
