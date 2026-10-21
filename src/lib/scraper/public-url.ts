import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { politeFetch, type PoliteFetchOptions } from "./http";

/**
 * SSRF guard for URLs typed by a person (admin "analyze this URL"): only public http(s)
 * hosts, every redirect hop re-checked. Blocks loopback, private, link-local (cloud
 * metadata 169.254.169.254), CGNAT, multicast and IPv6 equivalents.
 */
export class BlockedUrlError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "BlockedUrlError";
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKED.some(([base, bits]) => (n & (bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0)) >>> 0 === ipv4ToInt(base));
  }
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
  }
  return true; // not an IP at all: refuse rather than guess
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError("Буруу URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new BlockedUrlError("Зөвхөн http(s) хаяг зөвшөөрнө.");
  if (url.username || url.password) throw new BlockedUrlError("Нэвтрэх мэдээлэлтэй URL зөвшөөрөхгүй.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new BlockedUrlError("Зөвхөн 80/443 порт зөвшөөрнө.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new BlockedUrlError("Дотоод сүлжээний хаяг руу хандахыг хориглоно.");
  return url;
}

/** politeFetch for an untrusted URL: validates the host and every redirect (max 5). */
export async function fetchPublicUrl(raw: string, opts: PoliteFetchOptions = {}): Promise<Response> {
  let current = raw;
  for (let hop = 0; hop <= 5; hop++) {
    const url = await assertPublicUrl(current);
    const res = await politeFetch(url.toString(), { ...opts, redirect: "manual" });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) return res;
    current = new URL(location, url).toString();
  }
  throw new BlockedUrlError("Хэт олон redirect.");
}
