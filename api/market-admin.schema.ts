import { gql } from 'graphql-tag';

export const marketAdminApiSchema: any = gql`
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

    input CreateMarketInput {
        code: String!
        name: String!
        countryCode: String
        supportedCountryCodes: [String!]
        currency: String!
        defaultLanguage: String!
        supportedLanguages: [String!]
        urlPrefix: String
        channelCode: String!
        channelToken: String
        originHub: String
        enabled: Boolean
        isDefault: Boolean
        navigation: JSON
        homepage: JSON
        merchandising: JSON
        content: JSON
        seo: JSON
    }

    input UpdateMarketInput {
        id: ID!
        code: String
        name: String
        countryCode: String
        supportedCountryCodes: [String!]
        currency: String
        defaultLanguage: String
        supportedLanguages: [String!]
        urlPrefix: String
        channelCode: String
        channelToken: String
        originHub: String
        enabled: Boolean
        isDefault: Boolean
        navigation: JSON
        homepage: JSON
        merchandising: JSON
        content: JSON
        seo: JSON
    }

    type MarketDeletionResponse {
        result: String!
        message: String
    }

    extend type Query {
        adminMarkets(enabledOnly: Boolean): [Market!]!
        adminMarket(id: ID!): Market
    }

    extend type Mutation {
        createMarket(input: CreateMarketInput!): Market!
        updateMarket(input: UpdateMarketInput!): Market!
        deleteMarket(id: ID!): MarketDeletionResponse!
        seedDefaultMarkets: [Market!]!
    }
`;
