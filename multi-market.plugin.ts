import { OnApplicationBootstrap } from '@nestjs/common';
import {
    ChannelEvent,
    EventBus,
    Logger,
    PluginCommonModule,
    Type,
    VendurePlugin,
} from '@vendure/core';
import { MULTI_MARKET_OPTIONS } from './constants/market.constants';
import { Market } from './entities/market.entity';
import { MarketService } from './services/market.service';
import { GeoIpService } from './services/geo-ip.service';
import { marketShopApiSchema } from './api/market-shop.schema';
import { marketAdminApiSchema } from './api/market-admin.schema';
import { MarketShopResolver } from './resolvers/market-shop.resolver';
import { MarketAdminResolver } from './resolvers/market-admin.resolver';
import { MultiMarketPluginOptions } from './types/market.types';
import { MarketEvent } from './events/market.event';

@VendurePlugin({
    compatibility: '^3.0.0',
    imports: [PluginCommonModule],
    entities: [Market],
    providers: [
        MarketService,
        GeoIpService,
        {
            provide: MULTI_MARKET_OPTIONS,
            useFactory: () => MultiMarketPlugin.options,
        },
    ],
    shopApiExtensions: {
        schema: marketShopApiSchema,
        resolvers: [MarketShopResolver],
    },
    adminApiExtensions: {
        schema: marketAdminApiSchema,
        resolvers: [MarketAdminResolver],
    },
    dashboard: './dashboard',
})
export class MultiMarketPlugin implements OnApplicationBootstrap {
    static options: MultiMarketPluginOptions = {};

    constructor(
        private eventBus: EventBus,
        private marketService: MarketService
    ) {}

    static init(options: MultiMarketPluginOptions = {}): Type<MultiMarketPlugin> {
        this.options = options;
        return MultiMarketPlugin;
    }

    async onApplicationBootstrap() {
        // 1. Subscribe to MarketEvent for automated storefront cache invalidation
        this.eventBus.ofType(MarketEvent).subscribe(async event => {
            const rawUrl =
                MultiMarketPlugin.options.storefrontRevalidateUrl ||
                process.env.STOREFRONT_URL ||
                'http://localhost:3001';
            const revalidateUrl = rawUrl.endsWith('/api/revalidate')
                ? rawUrl
                : `${rawUrl.replace(/\/+$/, '')}/api/revalidate`;
            const secret =
                MultiMarketPlugin.options.revalidateSecret ||
                process.env.REVALIDATION_SECRET;

            if (revalidateUrl && secret) {
                try {
                    const response = await fetch(revalidateUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${secret}`,
                        },
                        body: JSON.stringify({ tags: ['markets', `market-${event.market.code}`] }),
                        signal: AbortSignal.timeout(5000),
                    });
                    if (!response.ok) {
                        Logger.warn(
                            `Storefront revalidation returned HTTP ${response.status} for market '${event.market.code}'`,
                            'MultiMarketPlugin'
                        );
                    }
                } catch (err: any) {
                    Logger.warn(
                        `Storefront cache revalidation failed for market '${event.market.code}': ${err?.message || err}`,
                        'MultiMarketPlugin'
                    );
                }
            }
        });

        // 2. Subscribe to ChannelEvent to clear cached market resolution when channels change
        this.eventBus.ofType(ChannelEvent).subscribe(event => {
            Logger.info(
                `Channel '${event.entity.code}' was ${event.type}. Clearing market cache.`,
                'MultiMarketPlugin'
            );
            this.marketService.clearCache();
        });
    }
}
