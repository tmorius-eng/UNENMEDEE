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
    const bytes = ipv6Bytes(ip);
    if (!bytes) return true;
    const embedded = embeddedIpv4(bytes);
    if (embedded) return isPrivateAddress(embedded);
    const v = ip.toLowerCase();
    return bytes.every((b) => b === 0) || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
  }
  return true; // not an IP at all: refuse rather than guess
}

/** The 16 bytes of an IPv6 address ("::" expanded, an embedded dotted quad read), or null. */
export function ipv6Bytes(ip: string): number[] | null {
  let v = ip.toLowerCase().replace(/%.*$/, "");
  const dotted = v.match(/:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const n = ipv4ToInt(dotted[1]);
    v = `${v.slice(0, -dotted[1].length)}${((n >>> 16) & 0xffff).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const halves = v.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  const bytes: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    bytes.push(n >> 8, n & 0xff);
  }
  return bytes;
}

/**
 * The IPv4 address an IPv6 one stands for: IPv4-mapped (::ffff:a.b.c.d, also written ::ffff:7f00:1),
 * IPv4-compatible (::a.b.c.d), NAT64 (64:ff9b::a.b.c.d) and 6to4 (2002:a.b.c.d::). Each of these
 * reaches the embedded IPv4 host, so it must pass the IPv4 private-range check.
 */
export function embeddedIpv4(bytes: number[]): string | null {
  const v4 = (at: number) => bytes.slice(at, at + 4).join(".");
  const zeros = (upTo: number) => bytes.slice(0, upTo).every((b) => b === 0);
  if (zeros(10) && bytes[10] === 0xff && bytes[11] === 0xff) return v4(12);
  if (zeros(12) && !(bytes[12] === 0 && bytes[13] === 0 && bytes[14] === 0 && bytes[15] <= 1)) return v4(12);
  if (bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b && bytes.slice(4, 12).every((b) => b === 0)) return v4(12);
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return v4(2);
  return null;
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
