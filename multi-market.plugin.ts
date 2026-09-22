import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { MULTI_MARKET_OPTIONS } from './constants/market.constants';
import { Market } from './entities/market.entity';
import { MarketService } from './services/market.service';
import { GeoIpService } from './services/geo-ip.service';
import { marketShopApiSchema } from './api/market-shop.schema';
import { marketAdminApiSchema } from './api/market-admin.schema';
import { MarketShopResolver } from './resolvers/market-shop.resolver';
import { MarketAdminResolver } from './resolvers/market-admin.resolver';
import { MultiMarketPluginOptions } from './types/market.types';

@VendurePlugin({
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
export class MultiMarketPlugin {
    static options: MultiMarketPluginOptions = {};

    static init(options: MultiMarketPluginOptions = {}): Type<MultiMarketPlugin> {
        this.options = options;
        return MultiMarketPlugin;
    }
}
