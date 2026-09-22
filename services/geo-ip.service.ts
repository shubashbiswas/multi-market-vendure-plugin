import { Inject, Injectable, Optional } from '@nestjs/common';
import { DEFAULT_GEO_HEADER_KEYS, MULTI_MARKET_OPTIONS } from '../constants/market.constants';
import { GeoProvider, MultiMarketPluginOptions } from '../types/market.types';

export interface RequestLike {
    headers?: Record<string, string | string[] | undefined>;
}

export class HeaderGeoProvider implements GeoProvider {
    headerKeys: string[];

    constructor(headerKeys: string[] = DEFAULT_GEO_HEADER_KEYS) {
        this.headerKeys = headerKeys;
    }

    async getCountry(request: unknown): Promise<string | null> {
        if (!request || typeof request !== 'object') {
            return null;
        }

        const req = request as RequestLike;
        const headers = req.headers || {};

        for (const key of this.headerKeys) {
            const val = headers[key.toLowerCase()];
            if (val) {
                const country = Array.isArray(val) ? val[0] : val;
                if (country && typeof country === 'string' && country.trim().length > 0) {
                    const cleaned = country.trim().toUpperCase();
                    if (cleaned !== 'XX' && cleaned !== 'T1') {
                        return cleaned;
                    }
                }
            }
        }

        return null;
    }
}

@Injectable()
export class GeoIpService {
    private provider: GeoProvider;

    constructor(
        @Optional()
        @Inject(MULTI_MARKET_OPTIONS)
        private options?: MultiMarketPluginOptions
    ) {
        this.provider =
            options?.geoProvider ||
            new HeaderGeoProvider(options?.geoHeaderKeys || DEFAULT_GEO_HEADER_KEYS);
    }

    async getCountry(request: unknown): Promise<string | null> {
        try {
            return await this.provider.getCountry(request);
        } catch (err) {
            return null;
        }
    }
}
