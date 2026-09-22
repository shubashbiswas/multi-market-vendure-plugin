import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';
import {
    MarketContent,
    MarketHomepage,
    MarketMerchandising,
    MarketNavigation,
    MarketSeo,
} from '../types/market.types';

@Entity('market')
export class Market extends VendureEntity {
    constructor(input?: DeepPartial<Market>) {
        super(input);
        if (input) {
            Object.assign(this, input);
        }
    }

    @Index({ unique: true })
    @Column()
    code: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    countryCode?: string;

    @Column('simple-json', { nullable: true })
    supportedCountryCodes?: string[];

    @Column()
    currency: string;

    @Column()
    defaultLanguage: string;

    @Column('simple-json', { nullable: true })
    supportedLanguages: string[];

    @Index()
    @Column({ default: '' })
    urlPrefix: string;

    @Index()
    @Column()
    channelCode: string;

    @Column({ nullable: true })
    channelToken?: string;

    @Column({ nullable: true })
    originHub?: string;

    @Column({ default: true })
    enabled: boolean;

    @Column({ default: false })
    isDefault: boolean;

    @Column('simple-json', { nullable: true })
    navigation?: MarketNavigation;

    @Column('simple-json', { nullable: true })
    homepage?: MarketHomepage;

    @Column('simple-json', { nullable: true })
    merchandising?: MarketMerchandising;

    @Column('simple-json', { nullable: true })
    content?: MarketContent;

    @Column('simple-json', { nullable: true })
    seo?: MarketSeo;
}
