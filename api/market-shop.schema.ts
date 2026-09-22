import { gql } from 'graphql-tag';

export const marketShopApiSchema: any = gql`
    type Market {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        code: String!
        name: String!
        countryCode: String
        supportedCountryCodes: [String!]
        currency: String!
        defaultLanguage: String!
        supportedLanguages: [String!]
        urlPrefix: String!
        channelCode: String!
        channelToken: String
        originHub: String
        enabled: Boolean!
        isDefault: Boolean!
        navigation: JSON
        homepage: JSON
        merchandising: JSON
        content: JSON
        seo: JSON
    }

    type MarketConfig {
        navigation: JSON
        homepage: JSON
        merchandising: JSON
        content: JSON
        seo: JSON
        originHub: String
    }

    type MarketResolutionResult {
        marketCode: String!
        channelCode: String!
        channelToken: String
        currency: String!
        defaultLanguage: String!
        urlPrefix: String!
        matchedStrategy: String!
        isDefault: Boolean!
    }

    type MarketRecommendation {
        recommendedMarketCode: String
        countryCode: String
        isRecommendedDifferentFromCurrent: Boolean!
        reason: String
    }

    type MarketSwitchResult {
        targetMarketCode: String!
        targetUrl: String!
        matchedRoute: Boolean!
    }

    extend type Query {
        markets(enabledOnly: Boolean): [Market!]!
        market(code: String!): Market
        marketByUrlPrefix(prefix: String!): Market
        marketConfig(code: String!): MarketConfig
        resolveMarket(
            urlPath: String
            selectedCode: String
            preferenceCode: String
        ): MarketResolutionResult!
        marketRecommendation(currentMarketCode: String): MarketRecommendation!
        switchMarket(
            currentUrl: String!
            targetMarketCode: String!
        ): MarketSwitchResult!
    }
`;
