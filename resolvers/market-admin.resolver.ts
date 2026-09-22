import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, Permission, RequestContext } from '@vendure/core';
import { Market } from '../entities/market.entity';
import { MarketService } from '../services/market.service';
import {
    CreateMarketInput,
    MarketDeletionResult,
    UpdateMarketInput,
} from '../types/market.types';

@Resolver()
export class MarketAdminResolver {
    constructor(private marketService: MarketService) {}

    @Query()
    @Allow(Permission.SuperAdmin, Permission.Authenticated)
    async adminMarkets(
        @Ctx() ctx: RequestContext,
        @Args('enabledOnly', { nullable: true }) enabledOnly?: boolean
    ): Promise<Market[]> {
        return this.marketService.findAll(ctx, enabledOnly ?? false);
    }

    @Query()
    @Allow(Permission.SuperAdmin, Permission.Authenticated)
    async adminMarket(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID
    ): Promise<Market | null> {
        return this.marketService.findById(ctx, id);
    }

    @Mutation()
    @Allow(Permission.SuperAdmin, Permission.Authenticated)
    async createMarket(
        @Ctx() ctx: RequestContext,
        @Args('input') input: CreateMarketInput
    ): Promise<Market> {
        return this.marketService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.SuperAdmin, Permission.Authenticated)
    async updateMarket(
        @Ctx() ctx: RequestContext,
        @Args('input') input: UpdateMarketInput
    ): Promise<Market> {
        return this.marketService.update(ctx, input);
    }

    @Mutation()
    @Allow(Permission.SuperAdmin, Permission.Authenticated)
    async deleteMarket(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID
    ): Promise<MarketDeletionResult> {
        return this.marketService.delete(ctx, id);
    }

    @Mutation()
    @Allow(Permission.SuperAdmin, Permission.Authenticated)
    async seedDefaultMarkets(
        @Ctx() ctx: RequestContext
    ): Promise<Market[]> {
        return this.marketService.seedDefaultMarkets(ctx);
    }
}
