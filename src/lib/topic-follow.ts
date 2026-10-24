import { TOPICS } from "@/lib/topics";

/**
 * Topics a reader follows ("Миний мэдээ", /my). Browser-only, in localStorage. No zod or push
 * imports here: the follow button ships on every topic page.
 */
export const TOPIC_FOLLOW_KEY = "iltod-topics";
export const FOLLOWABLE_TOPICS = TOPICS.map((t) => t.key);

export function isFollowableTopic(key: string): boolean {
  return FOLLOWABLE_TOPICS.includes(key);
}

/** Known topic keys only, no duplicates, in the stored order. */
export function parseTopicFollows(raw: string | null | undefined): string[] {
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? [...new Set(v.filter((k): k is string => typeof k === "string" && isFollowableTopic(k)))] : [];
  } catch {
    return [];
  }
}

export function toggleTopicFollow(follows: string[], key: string): string[] {
  return follows.includes(key) ? follows.filter((k) => k !== key) : [...follows, key];
}
