import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { politeFetch, type PoliteFetchOptions } from "./http";
import { isPrivateAddress } from "./net-guard";

export { embeddedIpv4, ipv6Bytes, isPrivateAddress } from "./net-guard";

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
