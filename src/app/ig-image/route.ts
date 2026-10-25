import { decode } from "fast-png";
import jpeg from "jpeg-js";

import { editionLabel } from "@/lib/edition";
import { formatDateMn, largestAmount, tldrSentences } from "@/lib/format";
import { hookCard } from "@/lib/og";
import { getArticleBySlug, getDigestById } from "@/lib/queries";
import { hookWords } from "@/lib/social/hook";

/**
 * Instagram feed card as JPEG (GET /ig-image?d=<digest id> or ?a=<article slug>): Instagram's
 * publishing API accepts only JPEG fetched from a public URL, while next/og renders PNG, so the PNG
 * is re-encoded here with pure-JS codecs (sharp is kept out of the functions, see next.config.ts).
 * Text comes from our own data, never from the query string.
 */
async function cardFor(params: URLSearchParams) {
  const d = params.get("d");
  if (d && /^\d{1,9}$/.test(d)) {
    const digest = await getDigestById(Number(d));
    const [top, ...rest] = digest?.items ?? [];
    return (
      digest &&
      top && {
        label: editionLabel(digest),
        words: hookWords(top.headline),
        sub: top.whyItMatters,
        more: rest.slice(0, 3).map((it) => it.headline),
        footer: `Онцлох тойм · ${digest.items.length} мэдээ`,
      }
    );
  }
  const slug = params.get("a");
  if (slug && /^[\w-]{1,200}$/.test(slug)) {
    const a = await getArticleBySlug(slug);
    if (!a) return null;
    const amount = largestAmount(a.amounts);
    return {
      label: a.riskFlag ? "Анхаарах мэдээ" : "Шинэ мэдээ",
      words: hookWords(a.title),
      sub: tldrSentences(a.tldr, 1)[0],
      more: amount ? [`Дүн: ${amount}`] : [],
      footer: `${a.sourceName}${a.scrapeMeta?.date_unknown ? "" : ` · ${formatDateMn(a.publishedAt)}`}`,
    };
  }
  return null;
}

export async function GET(request: Request) {
  const card = await cardFor(new URL(request.url).searchParams);
  if (!card) return new Response("Not found", { status: 404 });
  const png = decode(new Uint8Array(await (await hookCard(card)).arrayBuffer()));
  // fast-png returns RGB or RGBA; jpeg-js wants RGBA.
  const rgba = png.channels === 4 ? Buffer.from(png.data.buffer, png.data.byteOffset, png.data.byteLength) : toRgba(png.data, png.width * png.height);
  const out = jpeg.encode({ data: rgba, width: png.width, height: png.height }, 88);
  return new Response(new Uint8Array(out.data), {
    headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=3600, s-maxage=86400" },
  });
}

function toRgba(rgb: ArrayLike<number>, pixels: number): Buffer {
  const out = Buffer.alloc(pixels * 4);
  for (let i = 0; i < pixels; i++) {
    out[i * 4] = rgb[i * 3];
    out[i * 4 + 1] = rgb[i * 3 + 1];
    out[i * 4 + 2] = rgb[i * 3 + 2];
    out[i * 4 + 3] = 255;
  }
  return out;
}
