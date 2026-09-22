import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Market } from '../entities/market.entity';
import { HeaderGeoProvider, GeoIpService } from '../services/geo-ip.service';
import { MarketService } from '../services/market.service';
import { RequestContext } from '@vendure/core';

// Mock TransactionalConnection
class MockConnection {
    constructor(private markets: Market[]) {}

    getRepository(_ctx: any, _entity: any) {
        return {
            find: async () => this.markets,
            findOne: async (options: any) => {
                if (options?.where?.id) {
                    return this.markets.find(m => m.id === options.where.id) || null;
                }
                if (options?.where?.code) {
                    return this.markets.find(m => m.code === options.where.code) || null;
                }
                return null;
            },
            count: async () => this.markets.length,
            save: async (entity: Market) => {
                const existingIndex = this.markets.findIndex(m => m.code === entity.code);
                if (existingIndex >= 0) {
                    this.markets[existingIndex] = entity;
                } else {
                    (entity as any).id = (this.markets.length + 1).toString();
                    this.markets.push(entity);
                }
                return entity;
            },
            createQueryBuilder: () => ({
                update: () => ({
                    set: (fields: any) => ({
                        execute: async () => {
                            if (fields.isDefault === false) {
                                this.markets.forEach(m => { m.isDefault = false; });
                            }
                        },
                    }),
                }),
            }),
        };
    }
}

describe('Multi-Market Plugin Test Suite', () => {
    const mockMarkets: Market[] = [
        new Market({
            id: '1',
            code: 'global',
            name: 'Global Store',
            currency: 'USD',
            defaultLanguage: 'en',
            supportedLanguages: ['en'],
            urlPrefix: '',
            channelCode: '__default_channel__',
            enabled: true,
            isDefault: true,
            navigation: { primary: [{ id: '1', label: 'All Handlooms', href: '/collections/all' }] },
            homepage: { hero: { headline: 'Global Handloom Luxury' } },
            merchandising: { featuredCollectionSlugs: ['atelier'] },
            seo: { siteTitle: 'Suisuto Global' },
        }),
        new Market({
            id: '2',
            code: 'in',
            name: 'India',
            countryCode: 'IN',
            currency: 'INR',
            defaultLanguage: 'en',
            supportedLanguages: ['en', 'hi'],
            urlPrefix: 'in',
            channelCode: 'in-channel',
            enabled: true,
            isDefault: false,
            navigation: { primary: [{ id: '2', label: 'Varanasi Silks', href: '/in/collections/varanasi' }] },
            homepage: { hero: { headline: 'Varanasi Silk Excellence' } },
            merchandising: { featuredCollectionSlugs: ['varanasi-heritage'] },
            seo: { siteTitle: 'Suisuto India' },
        }),
        new Market({
            id: '3',
            code: 'bd',
            name: 'Bangladesh',
            countryCode: 'BD',
            currency: 'BDT',
            defaultLanguage: 'bn',
            supportedLanguages: ['bn', 'en'],
            urlPrefix: 'bd',
            channelCode: 'bd-channel',
            enabled: true,
            isDefault: false,
            navigation: { primary: [{ id: '3', label: 'Dhakai Jamdani', href: '/bd/collections/jamdani' }] },
            homepage: { hero: { headline: 'Dhakai Jamdani Heritage' } },
            merchandising: { featuredCollectionSlugs: ['dhakai-jamdani'] },
            seo: { siteTitle: 'Suisuto Bangladesh' },
        }),
    ];

    const ctx = RequestContext.empty();
    const geoService = new GeoIpService();
    const mockConn = new MockConnection([...mockMarkets]);
    const service = new MarketService(mockConn as any, geoService);

    describe('1. Market Resolution Priority', () => {
        it('resolves explicit URL /in/products/silk-saree to India market (Priority 1)', async () => {
            const result = await service.resolveMarket(ctx, {
                urlPath: '/in/products/silk-saree',
                selectedCode: 'bd',
                req: { headers: { 'cf-ipcountry': 'BD' } },
            });
            assert.strictEqual(result.marketCode, 'in');
            assert.strictEqual(result.channelCode, 'in-channel');
            assert.strictEqual(result.matchedStrategy, 'EXPLICIT_URL');
        });

        it('resolves root URL / to Global market (Priority 1)', async () => {
            const result = await service.resolveMarket(ctx, {
                urlPath: '/',
            });
            assert.strictEqual(result.marketCode, 'global');
            assert.strictEqual(result.channelCode, '__default_channel__');
            assert.strictEqual(result.matchedStrategy, 'EXPLICIT_URL');
        });

        it('resolves explicit user selection when no market in URL (Priority 2)', async () => {
            const result = await service.resolveMarket(ctx, {
                selectedCode: 'bd',
                preferenceCode: 'in',
                req: { headers: { 'cf-ipcountry': 'IN' } },
            });
            assert.strictEqual(result.marketCode, 'bd');
            assert.strictEqual(result.matchedStrategy, 'EXPLICIT_USER_SELECTION');
        });

        it('resolves persisted preference when no explicit selection (Priority 3)', async () => {
            const result = await service.resolveMarket(ctx, {
                preferenceCode: 'in',
                req: { headers: { 'cf-ipcountry': 'BD' } },
            });
            assert.strictEqual(result.marketCode, 'in');
            assert.strictEqual(result.matchedStrategy, 'PERSISTED_PREFERENCE');
        });

        it('resolves geo recommendation when no URL, selection, or preference (Priority 4)', async () => {
            const result = await service.resolveMarket(ctx, {
                req: { headers: { 'cf-ipcountry': 'BD' } },
            });
            assert.strictEqual(result.marketCode, 'bd');
            assert.strictEqual(result.matchedStrategy, 'GEO_RECOMMENDATION');
        });

        it('falls back to default Global market when no match exists (Priority 5)', async () => {
            const result = await service.resolveMarket(ctx, {
                req: { headers: { 'cf-ipcountry': 'ZZ' } }, // Unknown country
            });
            assert.strictEqual(result.marketCode, 'global');
            assert.strictEqual(result.matchedStrategy, 'GLOBAL_FALLBACK');
        });

        it('ensures explicit URL is never overridden by Geo-IP (Security Rule)', async () => {
            // Visitor IP is in Bangladesh, but requesting /in/ route
            const result = await service.resolveMarket(ctx, {
                urlPath: '/in/collections/silks',
                req: { headers: { 'cf-ipcountry': 'BD' } },
            });
            assert.strictEqual(result.marketCode, 'in');
            assert.strictEqual(result.matchedStrategy, 'EXPLICIT_URL');
        });
    });

    describe('2. Geo-IP Service & Recommendation', () => {
        it('extracts country code correctly across different CDN headers', async () => {
            const provider = new HeaderGeoProvider();
            
            // Cloudflare
            const cfCountry = await provider.getCountry({ headers: { 'cf-ipcountry': 'IN' } });
            assert.strictEqual(cfCountry, 'IN');

            // CloudFront
            const cfrontCountry = await provider.getCountry({ headers: { 'cloudfront-viewer-country': 'BD' } });
            assert.strictEqual(cfrontCountry, 'BD');

            // Custom proxy
            const proxyCountry = await provider.getCountry({ headers: { 'x-country-code': 'US' } });
            assert.strictEqual(proxyCountry, 'US');
        });

        it('returns soft suggestion when visitor country differs from active market', async () => {
            const rec = await service.getRecommendation(ctx, 'global', {
                headers: { 'cf-ipcountry': 'IN' },
            });
            assert.strictEqual(rec.isRecommendedDifferentFromCurrent, true);
            assert.strictEqual(rec.recommendedMarketCode, 'in');
            assert.strictEqual(rec.countryCode, 'IN');
        });

        it('flags no difference when visitor country already matches active market', async () => {
            const rec = await service.getRecommendation(ctx, 'in', {
                headers: { 'cf-ipcountry': 'IN' },
            });
            assert.strictEqual(rec.isRecommendedDifferentFromCurrent, false);
            assert.strictEqual(rec.recommendedMarketCode, 'in');
        });
    });

    describe('3. Market Switching & URL Preservation', () => {
        it('switches /in/products/shoes to /bd/products/shoes preserving deep path', async () => {
            const result = await service.switchMarket(ctx, '/in/products/shoes', 'bd');
            assert.strictEqual(result.targetUrl, '/bd/products/shoes');
            assert.strictEqual(result.matchedRoute, true);
        });

        it('switches regional /in/products/shoes to Global /products/shoes (empty prefix)', async () => {
            const result = await service.switchMarket(ctx, '/in/products/shoes', 'global');
            assert.strictEqual(result.targetUrl, '/products/shoes');
            assert.strictEqual(result.matchedRoute, true);
        });

        it('switches Global /products/shoes to regional /in/products/shoes', async () => {
            const result = await service.switchMarket(ctx, '/products/shoes', 'in');
            assert.strictEqual(result.targetUrl, '/in/products/shoes');
            assert.strictEqual(result.matchedRoute, true);
        });

        it('handles root URLs cleanly when switching', async () => {
            const result = await service.switchMarket(ctx, '/', 'bd');
            assert.strictEqual(result.targetUrl, '/bd');

            const toGlobal = await service.switchMarket(ctx, '/bd', 'global');
            assert.strictEqual(toGlobal.targetUrl, '/');
        });
    });

    describe('4. Dynamic Channel Mapping (Zero Hardcoding)', () => {
        it('maps markets to channels dynamically via database configuration', async () => {
            const inMarket = await service.findByCode(ctx, 'in');
            assert.strictEqual(inMarket?.channelCode, 'in-channel');

            const bdMarket = await service.findByCode(ctx, 'bd');
            assert.strictEqual(bdMarket?.channelCode, 'bd-channel');

            const globalMarket = await service.findByCode(ctx, 'global');
            assert.strictEqual(globalMarket?.channelCode, '__default_channel__');
        });

        it('resolves market by channel code correctly', async () => {
            const market = await service.findByChannelCode(ctx, 'in-channel');
            assert.strictEqual(market?.code, 'in');
        });
    });

    describe('5. Extensibility: Adding New Markets Without Code Changes', () => {
        it('supports adding a completely new market (e.g. UAE) purely via data/config', async () => {
            const newMarket = await service.create(ctx, {
                code: 'ae',
                name: 'United Arab Emirates',
                countryCode: 'AE',
                currency: 'AED',
                defaultLanguage: 'en',
                supportedLanguages: ['en', 'ar'],
                urlPrefix: 'ae',
                channelCode: 'ae-channel',
                enabled: true,
                isDefault: false,
                homepage: { hero: { headline: 'Dubai Luxury Atelier' } },
            });

            assert.strictEqual(newMarket.code, 'ae');
            assert.strictEqual(newMarket.currency, 'AED');
            assert.strictEqual(newMarket.channelCode, 'ae-channel');

            // Verify resolution immediately works for the new market
            const resolved = await service.resolveMarket(ctx, {
                urlPath: '/ae/atelier/collection',
            });
            assert.strictEqual(resolved.marketCode, 'ae');
            assert.strictEqual(resolved.channelCode, 'ae-channel');
            assert.strictEqual(resolved.currency, 'AED');

            // Verify switching to the new market works
            const switched = await service.switchMarket(ctx, '/in/atelier/collection', 'ae');
            assert.strictEqual(switched.targetUrl, '/ae/atelier/collection');
        });
    });
});
