-- Video narration with ElevenLabs (src/lib/video/elevenlabs.ts). IF NOT EXISTS: applied to production by hand right before the deploy that logs it.
ALTER TYPE "public"."ai_provider" ADD VALUE IF NOT EXISTS 'elevenlabs';
