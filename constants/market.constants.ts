export const MULTI_MARKET_OPTIONS = Symbol('MULTI_MARKET_OPTIONS');

export const DEFAULT_MARKET_CODE = 'global';

export const DEFAULT_GEO_HEADER_KEYS = [
    'x-mock-country',
    'x-suisuto-mock-country',
    'cf-ipcountry',
    'x-country-code',
    'x-geo-country',
    'cloudfront-viewer-country',
    'fastly-client-ip-country',
    'x-vercel-ip-country',
];

export const DEFAULT_CACHE_TTL_MS = 60_000; // 1 minute in-memory cache
