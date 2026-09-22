import { ID } from '@vendure/core';

export interface GeoProvider {
    getCountry(request: unknown): Promise<string | null>;
}

export interface MultiMarketPluginOptions {
    defaultMarketCode?: string;
    geoProvider?: GeoProvider;
    geoHeaderKeys?: string[];
    cacheTtlMs?: number;
}

export interface MarketNavigationItem {
    id: string;
    label: string;
    href: string;
    target?: string;
    badge?: string;
    children?: MarketNavigationItem[];
}

export interface MarketNavigation {
    primary?: MarketNavigationItem[];
    secondary?: MarketNavigationItem[];
    footer?: {
        columns?: {
            title: string;
            items: MarketNavigationItem[];
        }[];
        bottomLinks?: MarketNavigationItem[];
        copyright?: string;
    };
}

export interface HomepageSectionConfig {
    type: string;
    props?: Record<string, any>;
}

export interface MarketHomepage {
    sections?: HomepageSectionConfig[];
    hero?: {
        headline?: string;
        subHeadline?: string;
        ctaLabel?: string;
        ctaHref?: string;
        assetUrl?: string;
        badge?: string;
    };
}

export interface MarketMerchandising {
    featuredCollectionSlugs?: string[];
    featuredProductIds?: string[];
    pinnedCategories?: string[];
    productOrderPreference?: 'featured' | 'newest' | 'price-asc' | 'price-desc';
}

export interface MarketContent {
    announcementMarquee?: string[];
    supportEmail?: string;
    supportPhone?: string;
    originStorySnippet?: string;
    customDisclaimers?: string[];
}

export interface MarketSeo {
    siteTitle?: string;
    titleTemplate?: string;
    defaultMetaDescription?: string;
    ogImageUrl?: string;
    hreflangMapping?: Record<string, string>;
}

export interface MarketConfigData {
    navigation?: MarketNavigation;
    homepage?: MarketHomepage;
    merchandising?: MarketMerchandising;
    content?: MarketContent;
    seo?: MarketSeo;
}

export type MarketResolutionStrategy = 
    | 'EXPLICIT_URL'
    | 'EXPLICIT_USER_SELECTION'
    | 'PERSISTED_PREFERENCE'
    | 'GEO_RECOMMENDATION'
    | 'GLOBAL_FALLBACK';

export interface MarketResolutionResult {
    marketCode: string;
    channelCode: string;
    currency: string;
    defaultLanguage: string;
    urlPrefix: string;
    matchedStrategy: MarketResolutionStrategy;
    isDefault: boolean;
}

export interface MarketSwitchResult {
    targetMarketCode: string;
    targetUrl: string;
    matchedRoute: boolean;
}

export interface MarketRecommendation {
    recommendedMarketCode?: string;
    countryCode?: string;
    isRecommendedDifferentFromCurrent: boolean;
    reason?: string;
}

export interface CreateMarketInput {
    code: string;
    name: string;
    countryCode?: string;
    currency: string;
    defaultLanguage: string;
    supportedLanguages?: string[];
    urlPrefix?: string;
    channelCode: string;
    enabled?: boolean;
    isDefault?: boolean;
    navigation?: MarketNavigation;
    homepage?: MarketHomepage;
    merchandising?: MarketMerchandising;
    content?: MarketContent;
    seo?: MarketSeo;
}

export interface UpdateMarketInput {
    id: ID;
    code?: string;
    name?: string;
    countryCode?: string;
    currency?: string;
    defaultLanguage?: string;
    supportedLanguages?: string[];
    urlPrefix?: string;
    channelCode?: string;
    enabled?: boolean;
    isDefault?: boolean;
    navigation?: MarketNavigation;
    homepage?: MarketHomepage;
    merchandising?: MarketMerchandising;
    content?: MarketContent;
    seo?: MarketSeo;
}

export interface MarketDeletionResult {
    result: 'DELETED' | 'NOT_DELETED';
    message?: string;
}
