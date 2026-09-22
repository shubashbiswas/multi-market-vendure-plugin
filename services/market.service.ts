import { Inject, Injectable, Optional } from '@nestjs/common';
import {
    ID,
    RequestContext,
    TransactionalConnection,
    UserInputError,
} from '@vendure/core';
import {
    DEFAULT_CACHE_TTL_MS,
    DEFAULT_MARKET_CODE,
    MULTI_MARKET_OPTIONS,
} from '../constants/market.constants';
import { Market } from '../entities/market.entity';
import {
    CreateMarketInput,
    MarketConfigData,
    MarketDeletionResult,
    MarketRecommendation,
    MarketResolutionResult,
    MarketSwitchResult,
    MultiMarketPluginOptions,
    UpdateMarketInput,
} from '../types/market.types';
import { GeoIpService } from './geo-ip.service';

@Injectable()
export class MarketService {
    private cache: {
        timestamp: number;
        markets: Market[];
    } | null = null;

    private readonly cacheTtlMs: number;
    private readonly defaultMarketCode: string;

    constructor(
        private connection: TransactionalConnection,
        private geoIpService: GeoIpService,
        @Optional()
        @Inject(MULTI_MARKET_OPTIONS)
        private options?: MultiMarketPluginOptions
    ) {
        this.cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
        this.defaultMarketCode = options?.defaultMarketCode ?? DEFAULT_MARKET_CODE;
    }

    public clearCache(): void {
        this.cache = null;
    }

    /**
     * Retrieves all markets, cached in-memory with configured TTL.
     */
    async findAll(ctx: RequestContext, enabledOnly = true): Promise<Market[]> {
        const now = Date.now();
        if (this.cache && now - this.cache.timestamp < this.cacheTtlMs) {
            return enabledOnly
                ? this.cache.markets.filter(m => m.enabled)
                : this.cache.markets;
        }

        const markets = await this.connection
            .getRepository(ctx, Market)
            .find({ order: { isDefault: 'DESC', name: 'ASC' } });

        this.cache = {
            timestamp: now,
            markets,
        };

        return enabledOnly ? markets.filter(m => m.enabled) : markets;
    }

    async findById(ctx: RequestContext, id: ID): Promise<Market | null> {
        return this.connection.getRepository(ctx, Market).findOne({ where: { id } });
    }

    async findByCode(ctx: RequestContext, code: string): Promise<Market | null> {
        const normalized = (code || '').trim().toLowerCase();
        if (!normalized) return null;

        const markets = await this.findAll(ctx, false);
        return markets.find(m => m.code.toLowerCase() === normalized) || null;
    }

    async findByUrlPrefix(ctx: RequestContext, prefix: string): Promise<Market | null> {
        const normalized = (prefix || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
        const markets = await this.findAll(ctx, true);
        return (
            markets.find(m => {
                const p = (m.urlPrefix || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
                return p === normalized;
            }) || null
        );
    }

    async findByChannelCode(ctx: RequestContext, channelCode: string): Promise<Market | null> {
        const normalized = (channelCode || '').trim().toLowerCase();
        if (!normalized) return null;

        const markets = await this.findAll(ctx, false);
        return (
            markets.find(m => m.channelCode.toLowerCase() === normalized) || null
        );
    }

    async getDefaultMarket(ctx: RequestContext): Promise<Market | null> {
        const markets = await this.findAll(ctx, true);
        const explicitDefault = markets.find(m => m.isDefault);
        if (explicitDefault) return explicitDefault;

        const byCode = markets.find(
            m => m.code.toLowerCase() === this.defaultMarketCode.toLowerCase()
        );
        if (byCode) return byCode;

        return markets.length > 0 ? markets[0] : null;
    }

    /**
     * Resolves active market adhering to 5-tier priority:
     * 1. Explicit market in URL
     * 2. Explicit user market selection
     * 3. Persisted user preference
     * 4. Geo-IP recommendation
     * 5. Global fallback
     */
    async resolveMarket(
        ctx: RequestContext,
        options: {
            urlPath?: string;
            selectedCode?: string;
            preferenceCode?: string;
            req?: unknown;
        }
    ): Promise<MarketResolutionResult> {
        const markets = await this.findAll(ctx, true);
        const defaultMarket = await this.getDefaultMarket(ctx);

        // 1. Explicit URL check
        if (options.urlPath) {
            const cleanPath = options.urlPath.trim().replace(/^\/+|\/+$/g, '');
            const firstSegment = cleanPath.split('/')[0]?.toLowerCase() || '';

            if (firstSegment) {
                const matchedByPrefix = markets.find(m => {
                    const p = (m.urlPrefix || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
                    return p && p === firstSegment;
                });
                if (matchedByPrefix) {
                    return {
                        marketCode: matchedByPrefix.code,
                        channelCode: matchedByPrefix.channelCode,
                        currency: matchedByPrefix.currency,
                        defaultLanguage: matchedByPrefix.defaultLanguage,
                        urlPrefix: matchedByPrefix.urlPrefix,
                        matchedStrategy: 'EXPLICIT_URL',
                        isDefault: matchedByPrefix.isDefault,
                    };
                }

                // Or matched by market code directly
                const matchedByCode = markets.find(
                    m => m.code.toLowerCase() === firstSegment
                );
                if (matchedByCode) {
                    return {
                        marketCode: matchedByCode.code,
                        channelCode: matchedByCode.channelCode,
                        currency: matchedByCode.currency,
                        defaultLanguage: matchedByCode.defaultLanguage,
                        urlPrefix: matchedByCode.urlPrefix,
                        matchedStrategy: 'EXPLICIT_URL',
                        isDefault: matchedByCode.isDefault,
                    };
                }
            } else {
                // Root URL "/" matches market with empty urlPrefix
                const rootMarket = markets.find(
                    m => !(m.urlPrefix || '').trim().replace(/^\/+|\/+$/g, '')
                );
                if (rootMarket) {
                    return {
                        marketCode: rootMarket.code,
                        channelCode: rootMarket.channelCode,
                        currency: rootMarket.currency,
                        defaultLanguage: rootMarket.defaultLanguage,
                        urlPrefix: rootMarket.urlPrefix,
                        matchedStrategy: 'EXPLICIT_URL',
                        isDefault: rootMarket.isDefault,
                    };
                }
            }
        }

        // 2. Explicit user selection
        if (options.selectedCode) {
            const selected = markets.find(
                m => m.code.toLowerCase() === options.selectedCode!.trim().toLowerCase()
            );
            if (selected) {
                return {
                    marketCode: selected.code,
                    channelCode: selected.channelCode,
                    currency: selected.currency,
                    defaultLanguage: selected.defaultLanguage,
                    urlPrefix: selected.urlPrefix,
                    matchedStrategy: 'EXPLICIT_USER_SELECTION',
                    isDefault: selected.isDefault,
                };
            }
        }

        // 3. Persisted preference
        if (options.preferenceCode) {
            const pref = markets.find(
                m => m.code.toLowerCase() === options.preferenceCode!.trim().toLowerCase()
            );
            if (pref) {
                return {
                    marketCode: pref.code,
                    channelCode: pref.channelCode,
                    currency: pref.currency,
                    defaultLanguage: pref.defaultLanguage,
                    urlPrefix: pref.urlPrefix,
                    matchedStrategy: 'PERSISTED_PREFERENCE',
                    isDefault: pref.isDefault,
                };
            }
        }

        // 4. Geo-IP recommendation
        const request = options.req || (ctx as any).req;
        if (request) {
            const detectedCountry = await this.geoIpService.getCountry(request);
            if (detectedCountry) {
                const geoMatch = markets.find(
                    m =>
                        m.countryCode &&
                        m.countryCode.trim().toUpperCase() === detectedCountry.toUpperCase()
                );
                if (geoMatch) {
                    return {
                        marketCode: geoMatch.code,
                        channelCode: geoMatch.channelCode,
                        currency: geoMatch.currency,
                        defaultLanguage: geoMatch.defaultLanguage,
                        urlPrefix: geoMatch.urlPrefix,
                        matchedStrategy: 'GEO_RECOMMENDATION',
                        isDefault: geoMatch.isDefault,
                    };
                }
            }
        }

        // 5. Global Fallback
        const fallback = defaultMarket || markets[0];
        if (fallback) {
            return {
                marketCode: fallback.code,
                channelCode: fallback.channelCode,
                currency: fallback.currency,
                defaultLanguage: fallback.defaultLanguage,
                urlPrefix: fallback.urlPrefix,
                matchedStrategy: 'GLOBAL_FALLBACK',
                isDefault: fallback.isDefault,
            };
        }

        throw new UserInputError('No markets configured in database.');
    }

    /**
     * Generates recommendation for geo soft suggestion banner without overriding URL.
     */
    async getRecommendation(
        ctx: RequestContext,
        currentMarketCode?: string,
        req?: unknown
    ): Promise<MarketRecommendation> {
        const request = req || (ctx as any).req;
        const countryCode = await this.geoIpService.getCountry(request);
        if (!countryCode) {
            return {
                isRecommendedDifferentFromCurrent: false,
                countryCode: undefined,
            };
        }

        const markets = await this.findAll(ctx, true);
        const matchedMarket = markets.find(
            m => m.countryCode && m.countryCode.toUpperCase() === countryCode.toUpperCase()
        );

        if (!matchedMarket) {
            return {
                countryCode,
                isRecommendedDifferentFromCurrent: false,
            };
        }

        const isDifferent =
            !currentMarketCode ||
            currentMarketCode.trim().toLowerCase() !== matchedMarket.code.toLowerCase();

        return {
            countryCode,
            recommendedMarketCode: matchedMarket.code,
            isRecommendedDifferentFromCurrent: isDifferent,
            reason: `Detected visitor location: ${countryCode}`,
        };
    }

    /**
     * Calculates the target URL when switching markets.
     * Preserves deep paths (e.g. /in/products/silk-saree -> /bd/products/silk-saree or /products/silk-saree).
     */
    async switchMarket(
        ctx: RequestContext,
        currentUrl: string,
        targetMarketCode: string
    ): Promise<MarketSwitchResult> {
        const markets = await this.findAll(ctx, true);
        const target = markets.find(
            m => m.code.toLowerCase() === targetMarketCode.trim().toLowerCase()
        );

        if (!target) {
            throw new UserInputError(`Target market '${targetMarketCode}' not found or disabled.`);
        }

        let pathname = currentUrl || '/';
        try {
            if (currentUrl.startsWith('http://') || currentUrl.startsWith('https://')) {
                const parsed = new URL(currentUrl);
                pathname = parsed.pathname;
            }
        } catch (_) {
            pathname = currentUrl;
        }

        const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
        const segments = cleanPath ? cleanPath.split('/') : [];

        // Check if current URL starts with an existing market's urlPrefix
        let remainingSegments = segments;
        const currentPrefixMatch = markets.find(m => {
            const p = (m.urlPrefix || '').trim().replace(/^\/+|\/+$/g, '');
            return p && segments.length > 0 && segments[0].toLowerCase() === p.toLowerCase();
        });

        if (currentPrefixMatch) {
            remainingSegments = segments.slice(1);
        }

        const targetPrefix = (target.urlPrefix || '').trim().replace(/^\/+|\/+$/g, '');
        let targetPath: string;

        if (targetPrefix) {
            targetPath = remainingSegments.length > 0
                ? `/${targetPrefix}/${remainingSegments.join('/')}`
                : `/${targetPrefix}`;
        } else {
            targetPath = remainingSegments.length > 0
                ? `/${remainingSegments.join('/')}`
                : `/`;
        }

        return {
            targetMarketCode: target.code,
            targetUrl: targetPath,
            matchedRoute: remainingSegments.length > 0,
        };
    }

    async getMarketConfig(ctx: RequestContext, code: string): Promise<MarketConfigData> {
        const market = await this.findByCode(ctx, code);
        if (!market) {
            throw new UserInputError(`Market '${code}' not found.`);
        }

        return {
            navigation: market.navigation,
            homepage: market.homepage,
            merchandising: market.merchandising,
            content: market.content,
            seo: market.seo,
        };
    }

    // Admin CRUD Operations
    async create(ctx: RequestContext, input: CreateMarketInput): Promise<Market> {
        const repo = this.connection.getRepository(ctx, Market);
        const existing = await repo.findOne({ where: { code: input.code.trim().toLowerCase() } });
        if (existing) {
            throw new UserInputError(`Market with code '${input.code}' already exists.`);
        }

        if (input.isDefault) {
            await repo.createQueryBuilder().update(Market).set({ isDefault: false }).execute();
        }

        const market = new Market({
            ...input,
            code: input.code.trim().toLowerCase(),
            urlPrefix: (input.urlPrefix || '').trim().toLowerCase().replace(/^\/+|\/+$/g, ''),
            supportedLanguages: input.supportedLanguages || [input.defaultLanguage],
            enabled: input.enabled ?? true,
            isDefault: input.isDefault ?? false,
        });

        const saved = await repo.save(market);
        this.clearCache();
        return saved;
    }

    async update(ctx: RequestContext, input: UpdateMarketInput): Promise<Market> {
        const repo = this.connection.getRepository(ctx, Market);
        const market = await repo.findOne({ where: { id: input.id } });
        if (!market) {
            throw new UserInputError(`Market with ID '${input.id}' not found.`);
        }

        if (input.code && input.code.trim().toLowerCase() !== market.code) {
            const codeConflict = await repo.findOne({
                where: { code: input.code.trim().toLowerCase() },
            });
            if (codeConflict) {
                throw new UserInputError(`Market with code '${input.code}' already exists.`);
            }
            market.code = input.code.trim().toLowerCase();
        }

        if (input.isDefault) {
            await repo.createQueryBuilder().update(Market).set({ isDefault: false }).execute();
            market.isDefault = true;
        } else if (input.isDefault === false) {
            market.isDefault = false;
        }

        if (input.name !== undefined) market.name = input.name;
        if (input.countryCode !== undefined) market.countryCode = input.countryCode?.trim().toUpperCase();
        if (input.currency !== undefined) market.currency = input.currency.trim().toUpperCase();
        if (input.defaultLanguage !== undefined) market.defaultLanguage = input.defaultLanguage.trim().toLowerCase();
        if (input.supportedLanguages !== undefined) market.supportedLanguages = input.supportedLanguages;
        if (input.urlPrefix !== undefined) {
            market.urlPrefix = input.urlPrefix.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
        }
        if (input.channelCode !== undefined) market.channelCode = input.channelCode.trim();
        if (input.enabled !== undefined) market.enabled = input.enabled;
        if (input.navigation !== undefined) market.navigation = input.navigation;
        if (input.homepage !== undefined) market.homepage = input.homepage;
        if (input.merchandising !== undefined) market.merchandising = input.merchandising;
        if (input.content !== undefined) market.content = input.content;
        if (input.seo !== undefined) market.seo = input.seo;

        const saved = await repo.save(market);
        this.clearCache();
        return saved;
    }

    async delete(ctx: RequestContext, id: ID): Promise<MarketDeletionResult> {
        const repo = this.connection.getRepository(ctx, Market);
        const market = await repo.findOne({ where: { id } });
        if (!market) {
            return {
                result: 'NOT_DELETED',
                message: `Market with ID '${id}' not found.`,
            };
        }

        await repo.remove(market);
        this.clearCache();
        return {
            result: 'DELETED',
            message: `Market '${market.name}' (${market.code}) deleted successfully.`,
        };
    }

    /**
     * Seeds initial default markets if no markets exist.
     */
    async seedDefaultMarkets(ctx: RequestContext): Promise<Market[]> {
        const repo = this.connection.getRepository(ctx, Market);
        const count = await repo.count();
        if (count > 0) {
            return this.findAll(ctx, false);
        }

        const defaults: Partial<Market>[] = [
            {
                code: 'global',
                name: 'Global Store',
                currency: 'USD',
                defaultLanguage: 'en',
                supportedLanguages: ['en'],
                urlPrefix: '',
                channelCode: '__default_channel__',
                enabled: true,
                isDefault: true,
                seo: {
                    siteTitle: 'Suisuto — Artisanal Luxury Handlooms',
                    titleTemplate: '%s | Suisuto Global',
                    defaultMetaDescription: 'Curated handwoven heritage textiles and luxury apparel.',
                },
                content: {
                    announcementMarquee: [
                        'Complimentary worldwide white-glove shipping on orders over $500',
                        'Artisanal handwoven couture crafted in heritage looms',
                    ],
                },
            },
            {
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
                seo: {
                    siteTitle: 'Suisuto India — Varanasi Handloom Excellence',
                    titleTemplate: '%s | Suisuto India',
                    defaultMetaDescription: 'Varanasi silk sarees and heritage luxury textiles.',
                },
                content: {
                    announcementMarquee: [
                        'Free domestic express delivery across India',
                        'Authentic Handloom Mark certified craftsmanship',
                    ],
                },
            },
            {
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
                seo: {
                    siteTitle: 'Suisuto Bangladesh — Dhakai Jamdani Heritage',
                    titleTemplate: '%s | Suisuto Bangladesh',
                    defaultMetaDescription: 'Heritage Muslin and Jamdani artisanal weaves.',
                },
                content: {
                    announcementMarquee: [
                        'Dhaka & Narayanganj next-day concierge delivery',
                        'Traditional GI tagged Jamdani masterpieces',
                    ],
                },
            },
        ];

        const saved: Market[] = [];
        for (const item of defaults) {
            const m = new Market(item);
            saved.push(await repo.save(m));
        }

        this.clearCache();
        return saved;
    }
}
