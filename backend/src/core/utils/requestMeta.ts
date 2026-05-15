import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import type { Request } from 'express';

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
}

/**
 * Extracts the real client IP address
 * Respects X-Forwarded-For when behind a proxy/load balancer
 */
function extractIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const [first = ''] = Array.isArray(forwarded)
      ? forwarded
      : forwarded.split(',');
    return first.trim() || null;
  }
  return req.socket.remoteAddress ?? null;
}

/**
 * Parses User-Agent string into browser, OS and device type
 */
function parseUserAgent(ua: string): {
  browser: string | null;
  os: string | null;
  device: string | null;
} {
  const parser = new UAParser(ua);
  const result = parser.getResult();

  const browser = result.browser.name ?? null;
  const os = result.os.name ?? null;

  // ua-parser-js sets device.type for non-desktop (mobile, tablet, etc.)
  // undefined means desktop
  const device = result.device.type ?? 'desktop';

  return { browser, os, device };
}

/**
 * Resolves country, region and city from an IP address using the local GeoIP database
 * Returns nulls for private/loopback IPs or unrecognized addresses
 */
function resolveGeo(ip: string): {
  country: string | null;
  region: string | null;
  city: string | null;
} {
  const geo = geoip.lookup(ip);
  if (!geo) return { country: null, region: null, city: null };
  return {
    country: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
  };
}

/**
 * Extracts all request metadata (IP, device, geo) from an Express request
 * All fields are nullable — never throws
 */
export function extractRequestMeta(req: Request): RequestMeta {
  const ipAddress = extractIp(req);
  const rawUserAgent = req.headers['user-agent'] ?? null;

  const { browser, os, device } = rawUserAgent
    ? parseUserAgent(rawUserAgent)
    : { browser: null, os: null, device: null };

  const { country, region, city } = ipAddress
    ? resolveGeo(ipAddress)
    : { country: null, region: null, city: null };

  return {
    ipAddress,
    userAgent: rawUserAgent,
    browser,
    os,
    device,
    country,
    region,
    city,
  };
}
