import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * SSRF protection: blocks requests to private, loopback, link-local,
 * and other non-public IP ranges. Applied to every server-side fetch
 * of a user-supplied or user-influenced URL (page discovery, signal
 * gathering, robots.txt, sitemap).
 *
 * Known limitation: this validates the resolved IP at check-time and
 * re-validates on every redirect hop, but it does not pin the actual
 * TCP connection to the validated IP. A fast DNS-rebinding attack
 * (re-resolving the hostname to a different IP between our check and
 * fetch's own connect) is theoretically still possible. Fully closing
 * that gap needs a custom fetch dispatcher with a pinned resolver
 * (undici Agent + custom `lookup`) - worth adding if this tool is ever
 * exposed to high-volume adversarial traffic.
 */

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

function isPrivateIPv4(ip: string): boolean {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some(o => Number.isNaN(o))) return false;
  const [a, b] = octets;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 169 && b === 254) return true; // link-local / cloud metadata (169.254.169.254 etc.)
  if (a === 0) return true; // "this" network
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT shared address space
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true; // loopback
  if (lower.startsWith('fe80')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
  if (lower.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 address - check the embedded IPv4
    return isPrivateIPv4(lower.replace('::ffff:', ''));
  }
  return false;
}

/**
 * Throws if the given URL's host resolves to a non-public address.
 * Call this before every server-side fetch of a user-influenced URL.
 */
export async function assertPublicHost(urlStr: string): Promise<void> {
  const parsed = new URL(urlStr);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Blocked non-HTTP(S) scheme: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(`Blocked host: ${hostname}`);
  }

  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4) {
    if (isPrivateIPv4(hostname)) throw new Error(`Blocked private IP: ${hostname}`);
    return;
  }
  if (ipVersion === 6) {
    if (isPrivateIPv6(hostname)) throw new Error(`Blocked private IP: ${hostname}`);
    return;
  }

  // Not a literal IP - resolve DNS and check every returned address
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error(`Could not resolve host: ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new Error(`No addresses resolved for host: ${hostname}`);
  }

  for (const addr of addresses) {
    if (addr.family === 4 && isPrivateIPv4(addr.address)) {
      throw new Error(`Blocked private IP resolution for ${hostname}: ${addr.address}`);
    }
    if (addr.family === 6 && isPrivateIPv6(addr.address)) {
      throw new Error(`Blocked private IP resolution for ${hostname}: ${addr.address}`);
    }
  }
}

/**
 * Fetch wrapper that validates the host before connecting, and
 * re-validates on every redirect hop instead of letting fetch follow
 * redirects blindly. Without this, a classic SSRF bypass is: submit a
 * public URL that returns a 302 to an internal address, and a naive
 * fetch(url, { redirect: 'follow' }) will happily follow it.
 */
export async function safeFetch(
  urlStr: string,
  init: RequestInit = {},
  maxRedirects = 5
): Promise<Response> {
  let currentUrl = urlStr;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicHost(currentUrl);

    const res = await fetch(currentUrl, { ...init, redirect: 'manual' });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return res; // redirect status with no target - just return it as-is
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return res;
  }

  throw new Error(`Too many redirects (>${maxRedirects}) resolving ${urlStr}`);
}
