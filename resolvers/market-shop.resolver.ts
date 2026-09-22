import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext } from '@vendure/core';
import { Market } from '../entities/market.entity';
import { MarketService } from '../services/market.service';
import {
    MarketConfigData,
    MarketRecommendation,
    MarketResolutionResult,
    MarketSwitchResult,
} from '../types/market.types';

@Resolver()
export class MarketShopResolver {
    constructor(private marketService: MarketService) {}

    @Query()
    async markets(
        @Ctx() ctx: RequestContext,
        @Args('enabledOnly', { nullable: true }) enabledOnly?: boolean
    ): Promise<Market[]> {
        return this.marketService.findAll(ctx, enabledOnly ?? true);
    }

    @Query()
    async market(
        @Ctx() ctx: RequestContext,
        @Args('code') code: string
    ): Promise<Market | null> {
        return this.marketService.findByCode(ctx, code);
    }

    @Query()
    async marketByUrlPrefix(
        @Ctx() ctx: RequestContext,
        @Args('prefix') prefix: string
    ): Promise<Market | null> {
        return this.marketService.findByUrlPrefix(ctx, prefix);
    }

    @Query()
    async marketConfig(
        @Ctx() ctx: RequestContext,
        @Args('code') code: string
    ): Promise<MarketConfigData> {
        return this.marketService.getMarketConfig(ctx, code);
    }

    @Query()
    async resolveMarket(
        @Ctx() ctx: RequestContext,
        @Args('urlPath', { nullable: true }) urlPath?: string,
        @Args('selectedCode', { nullable: true }) selectedCode?: string,
        @Args('preferenceCode', { nullable: true }) preferenceCode?: string
    ): Promise<MarketResolutionResult> {
        return this.marketService.resolveMarket(ctx, {
            urlPath,
            selectedCode,
            preferenceCode,
            req: (ctx as any).req,
        });
    }

    @Query()
    async marketRecommendation(
        @Ctx() ctx: RequestContext,
        @Args('currentMarketCode', { nullable: true }) currentMarketCode?: string
    ): Promise<MarketRecommendation> {
        return this.marketService.getRecommendation(ctx, currentMarketCode, (ctx as any).req);
    }

    @Query()
    async switchMarket(
        @Ctx() ctx: RequestContext,
        @Args('currentUrl') currentUrl: string,
        @Args('targetMarketCode') targetMarketCode: string
    ): Promise<MarketSwitchResult> {
        return this.marketService.switchMarket(ctx, currentUrl, targetMarketCode);
    }
}
