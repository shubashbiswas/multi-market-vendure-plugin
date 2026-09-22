import { RequestContext, VendureEvent } from '@vendure/core';
import { Market } from '../entities/market.entity';

export type MarketAction = 'created' | 'updated' | 'deleted';

/**
 * @description
 * An event that is published whenever a Market is created, updated, or deleted.
 */
export class MarketEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public market: Market,
        public action: MarketAction
    ) {
        super();
    }
}
