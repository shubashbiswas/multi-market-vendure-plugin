import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@vendure/dashboard';
import {
    Globe,
    Plus,
    Trash2,
    Edit3,
    CheckCircle2,
    XCircle,
    RefreshCw,
    AlertCircle,
    X,
    Star,
    Compass,
    Layers,
    Sliders,
    Search,
    Filter,
} from 'lucide-react';

interface MarketItem {
    id: string;
    code: string;
    name: string;
    countryCode?: string;
    supportedCountryCodes?: string[];
    currency: string;
    defaultLanguage: string;
    supportedLanguages?: string[];
    urlPrefix: string;
    channelCode: string;
    channelToken?: string;
    enabled: boolean;
    isDefault: boolean;
    navigation?: any;
    homepage?: any;
    merchandising?: any;
    content?: any;
    seo?: any;
}

interface ChannelItem {
    id: string;
    code: string;
    token: string;
    defaultCurrencyCode?: string;
}

const GET_ADMIN_MARKETS_QUERY = `
    query GetAdminMarkets($enabledOnly: Boolean) {
        adminMarkets(enabledOnly: $enabledOnly) {
            id
            createdAt
            updatedAt
            code
            name
            countryCode
            supportedCountryCodes
            currency
            defaultLanguage
            supportedLanguages
            urlPrefix
            channelCode
            channelToken
            enabled
            isDefault
            navigation
            homepage
            merchandising
            content
            seo
        }
    }
`;

const GET_CHANNELS_QUERY = `
    query GetChannels {
        channels {
            items {
                id
                code
                token
                defaultCurrencyCode
            }
        }
    }
`;

const CREATE_MARKET_MUTATION = `
    mutation CreateMarket($input: CreateMarketInput!) {
        createMarket(input: $input) {
            id
            code
            name
            currency
            channelCode
            enabled
            isDefault
        }
    }
`;

const UPDATE_MARKET_MUTATION = `
    mutation UpdateMarket($input: UpdateMarketInput!) {
        updateMarket(input: $input) {
            id
            code
            name
            currency
            channelCode
            enabled
            isDefault
        }
    }
`;

const DELETE_MARKET_MUTATION = `
    mutation DeleteMarket($id: ID!) {
        deleteMarket(id: $id) {
            result
            message
        }
    }
`;

const SEED_DEFAULT_MARKETS_MUTATION = `
    mutation SeedDefaultMarkets {
        seedDefaultMarkets {
            id
            code
            name
        }
    }
`;

export function MarketControlPage() {
    const [markets, setMarkets] = useState<MarketItem[]>([]);
    const [channels, setChannels] = useState<ChannelItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Filters & Search
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingMarket, setEditingMarket] = useState<MarketItem | null>(null);
    const [activeTab, setActiveTab] = useState<'basic' | 'navigation' | 'homepage' | 'merchandising' | 'seo'>('basic');

    // Form fields
    const [formCode, setFormCode] = useState('');
    const [formName, setFormName] = useState('');
    const [formCountryCode, setFormCountryCode] = useState('');
    const [formSupportedCountryCodes, setFormSupportedCountryCodes] = useState('');
    const [formCurrency, setFormCurrency] = useState('USD');
    const [formDefaultLanguage, setFormDefaultLanguage] = useState('en');
    const [formSupportedLanguages, setFormSupportedLanguages] = useState('en');
    const [formUrlPrefix, setFormUrlPrefix] = useState('');
    const [formChannelCode, setFormChannelCode] = useState('');
    const [formEnabled, setFormEnabled] = useState(true);
    const [formIsDefault, setFormIsDefault] = useState(false);

    // JSON editor states
    const [formNavigationJson, setFormNavigationJson] = useState('{}');
    const [formHomepageJson, setFormHomepageJson] = useState('{}');
    const [formMerchandisingJson, setFormMerchandisingJson] = useState('{}');
    const [formSeoJson, setFormSeoJson] = useState('{}');

    const executeGql = async (query: string, variables?: any) => {
        if (api && typeof (api as any).query === 'function' && !query.trim().startsWith('mutation')) {
            return (api as any).query(query, variables);
        }
        if (api && typeof (api as any).mutate === 'function' && query.trim().startsWith('mutation')) {
            return (api as any).mutate(query, variables);
        }
        const res = await fetch('/admin-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ query, variables }),
        });
        const json = await res.json();
        if (json.errors?.length) {
            throw new Error(json.errors[0].message);
        }
        return json.data;
    };

    const loadMarkets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [marketData, channelData] = await Promise.all([
                executeGql(GET_ADMIN_MARKETS_QUERY, { enabledOnly: false }),
                executeGql(GET_CHANNELS_QUERY).catch(() => null),
            ]);
            if (marketData?.adminMarkets) {
                setMarkets(marketData.adminMarkets);
            }
            if (channelData?.channels?.items) {
                setChannels(channelData.channels.items);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load markets');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMarkets();
    }, [loadMarkets]);

    const openCreateModal = () => {
        setEditingMarket(null);
        setFormCode('');
        setFormName('');
        setFormCountryCode('');
        setFormSupportedCountryCodes('');
        setFormCurrency('USD');
        setFormDefaultLanguage('en');
        setFormSupportedLanguages('en');
        setFormUrlPrefix('');
        setFormChannelCode(channels[0]?.code || '');
        setFormEnabled(true);
        setFormIsDefault(false);
        setFormNavigationJson('{}');
        setFormHomepageJson('{}');
        setFormMerchandisingJson('{}');
        setFormSeoJson('{}');
        setActiveTab('basic');
        setIsCreateOpen(true);
    };

    const openEditModal = (market: MarketItem) => {
        setEditingMarket(market);
        setFormCode(market.code);
        setFormName(market.name);
        setFormCountryCode(market.countryCode || '');
        setFormSupportedCountryCodes(market.supportedCountryCodes?.join(', ') || '');
        setFormCurrency(market.currency);
        setFormDefaultLanguage(market.defaultLanguage);
        setFormSupportedLanguages(
            market.supportedLanguages?.join(', ') || market.defaultLanguage
        );
        setFormUrlPrefix(market.urlPrefix || '');
        setFormChannelCode(market.channelCode);
        setFormEnabled(market.enabled);
        setFormIsDefault(market.isDefault);
        setFormNavigationJson(JSON.stringify(market.navigation || {}, null, 2));
        setFormHomepageJson(JSON.stringify(market.homepage || {}, null, 2));
        setFormMerchandisingJson(JSON.stringify(market.merchandising || {}, null, 2));
        setFormSeoJson(JSON.stringify(market.seo || {}, null, 2));
        setActiveTab('basic');
        setIsCreateOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            let parsedNav = null;
            let parsedHp = null;
            let parsedMerch = null;
            let parsedSeo = null;

            try {
                if (formNavigationJson.trim()) parsedNav = JSON.parse(formNavigationJson);
            } catch {
                throw new Error('Navigation JSON is invalid');
            }
            try {
                if (formHomepageJson.trim()) parsedHp = JSON.parse(formHomepageJson);
            } catch {
                throw new Error('Homepage JSON is invalid');
            }
            try {
                if (formMerchandisingJson.trim()) parsedMerch = JSON.parse(formMerchandisingJson);
            } catch {
                throw new Error('Merchandising JSON is invalid');
            }
            try {
                if (formSeoJson.trim()) parsedSeo = JSON.parse(formSeoJson);
            } catch {
                throw new Error('SEO JSON is invalid');
            }

            const supportedLangs = formSupportedLanguages
                .split(',')
                .map(s => s.trim().toLowerCase())
                .filter(Boolean);

            const supportedCountries = formSupportedCountryCodes
                .split(',')
                .map(s => s.trim().toUpperCase())
                .filter(Boolean);

            if (editingMarket) {
                await executeGql(UPDATE_MARKET_MUTATION, {
                    input: {
                        id: editingMarket.id,
                        code: formCode,
                        name: formName,
                        countryCode: formCountryCode.trim().toUpperCase() || null,
                        supportedCountryCodes: supportedCountries,
                        currency: formCurrency.trim().toUpperCase(),
                        defaultLanguage: formDefaultLanguage.trim().toLowerCase(),
                        supportedLanguages: supportedLangs,
                        urlPrefix: formUrlPrefix.trim().toLowerCase(),
                        channelCode: formChannelCode.trim(),
                        enabled: formEnabled,
                        isDefault: formIsDefault,
                        navigation: parsedNav,
                        homepage: parsedHp,
                        merchandising: parsedMerch,
                        seo: parsedSeo,
                    },
                });
                setSuccessMessage(`Market '${formName}' updated successfully.`);
            } else {
                await executeGql(CREATE_MARKET_MUTATION, {
                    input: {
                        code: formCode,
                        name: formName,
                        countryCode: formCountryCode.trim().toUpperCase() || null,
                        supportedCountryCodes: supportedCountries,
                        currency: formCurrency.trim().toUpperCase(),
                        defaultLanguage: formDefaultLanguage.trim().toLowerCase(),
                        supportedLanguages: supportedLangs,
                        urlPrefix: formUrlPrefix.trim().toLowerCase(),
                        channelCode: formChannelCode.trim(),
                        enabled: formEnabled,
                        isDefault: formIsDefault,
                        navigation: parsedNav,
                        homepage: parsedHp,
                        merchandising: parsedMerch,
                        seo: parsedSeo,
                    },
                });
                setSuccessMessage(`Market '${formName}' created successfully.`);
            }

            setIsCreateOpen(false);
            loadMarkets();
        } catch (err: any) {
            setError(err.message || 'Failed to save market');
        }
    };

    const handleDelete = async (market: MarketItem) => {
        if (!window.confirm(`Are you sure you want to delete market '${market.name}' (${market.code})?`)) {
            return;
        }
        try {
            await executeGql(DELETE_MARKET_MUTATION, { id: market.id });
            setSuccessMessage(`Market '${market.name}' deleted.`);
            loadMarkets();
        } catch (err: any) {
            setError(err.message || 'Failed to delete market');
        }
    };

    const handleToggleEnabled = async (market: MarketItem) => {
        try {
            await executeGql(UPDATE_MARKET_MUTATION, {
                input: {
                    id: market.id,
                    enabled: !market.enabled,
                },
            });
            loadMarkets();
        } catch (err: any) {
            setError(err.message || 'Failed to toggle status');
        }
    };

    const handleSeedDefaults = async () => {
        if (!window.confirm('Seed default markets (Global, India, Bangladesh)?')) {
            return;
        }
        try {
            await executeGql(SEED_DEFAULT_MARKETS_MUTATION);
            setSuccessMessage('Default markets seeded successfully.');
            loadMarkets();
        } catch (err: any) {
            setError(err.message || 'Failed to seed default markets');
        }
    };

    // Filtered markets
    const filteredMarkets = markets.filter(m => {
        if (filterStatus === 'active' && !m.enabled) return false;
        if (filterStatus === 'disabled' && m.enabled) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                m.name.toLowerCase().includes(q) ||
                m.code.toLowerCase().includes(q) ||
                m.channelCode.toLowerCase().includes(q) ||
                m.currency.toLowerCase().includes(q) ||
                (m.countryCode && m.countryCode.toLowerCase().includes(q))
            );
        }
        return true;
    });

    const activeMarketsCount = markets.filter(m => m.enabled).length;
    const defaultMarket = markets.find(m => m.isDefault);
    const uniqueChannels = new Set(markets.map(m => m.channelCode)).size;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-foreground">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Globe className="size-6 text-primary" /> Multi-Market Configuration
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Configure regional storefront markets, deterministic URL routing, Vendure channel mappings, and content.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {markets.length === 0 && (
                        <button
                            type="button"
                            onClick={handleSeedDefaults}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition shadow-xs cursor-pointer"
                        >
                            <RefreshCw className="size-4" /> Seed Defaults
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs cursor-pointer"
                    >
                        <Plus className="size-4" /> Add Market
                    </button>
                </div>
            </div>

            {/* KPI / Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-card border border-border rounded-lg shadow-xs">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Markets</div>
                    <div className="text-2xl font-bold mt-1 text-foreground">{markets.length}</div>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg shadow-xs">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Markets</div>
                    <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                        {activeMarketsCount}
                    </div>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg shadow-xs">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Default Market</div>
                    <div className="text-2xl font-bold mt-1 text-primary">
                        {defaultMarket ? `${defaultMarket.name} (${defaultMarket.code})` : 'None'}
                    </div>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg shadow-xs">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Mapped Channels</div>
                    <div className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                        {uniqueChannels}
                    </div>
                </div>
            </div>

            {/* Filters & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Filter className="size-3.5" /> Status:
                    </span>
                    {(['all', 'active', 'disabled'] as const).map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setFilterStatus(s)}
                            className={`px-2.5 py-1 text-xs rounded-md font-medium capitalize transition cursor-pointer ${
                                filterStatus === s
                                    ? 'bg-background shadow-xs text-foreground border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search markets..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary w-48 sm:w-64"
                    />
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button type="button" onClick={() => setError(null)} className="text-destructive hover:opacity-70 cursor-pointer">
                        <X className="size-4" />
                    </button>
                </div>
            )}
            {successMessage && (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    <button type="button" onClick={() => setSuccessMessage(null)} className="hover:opacity-70 cursor-pointer">
                        <X className="size-4" />
                    </button>
                </div>
            )}

            {/* Market List Table */}
            <div className="border border-border rounded-lg bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <tr>
                                <th className="py-3 px-4">Market</th>
                                <th className="py-3 px-4">Code</th>
                                <th className="py-3 px-4">Storefront URL</th>
                                <th className="py-3 px-4">Vendure Channel & Token</th>
                                <th className="py-3 px-4">Currency</th>
                                <th className="py-3 px-4">Languages</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                                        <RefreshCw className="size-6 animate-spin mx-auto mb-2 opacity-60" />
                                        Loading markets...
                                    </td>
                                </tr>
                            ) : filteredMarkets.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                                        <Globe className="size-8 mx-auto mb-2 opacity-40" />
                                        {markets.length === 0
                                            ? 'No markets configured yet. Click "Seed Defaults" or "Add Market" to begin.'
                                            : 'No markets matching the selected filters.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredMarkets.map(market => (
                                    <tr key={market.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="py-3.5 px-4 font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                <span>{market.name}</span>
                                                {market.isDefault && (
                                                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/20">
                                                        <Star className="size-3 fill-amber-500 text-amber-500" /> Default
                                                    </span>
                                                )}
                                            </div>
                                            {market.countryCode && (
                                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                    <span>Primary: {market.countryCode}</span>
                                                    {market.supportedCountryCodes && market.supportedCountryCodes.length > 0 && (
                                                        <span className="text-muted-foreground/75">
                                                            (+{market.supportedCountryCodes.length} clustered)
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                                            {market.code}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-xs">
                                            <span className="px-2 py-1 rounded-md bg-muted/60 text-foreground border border-border">
                                                {market.urlPrefix ? `/${market.urlPrefix}/` : '/ (root)'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-mono text-xs text-foreground font-medium">{market.channelCode}</div>
                                            {market.channelToken && (
                                                <div className="font-mono text-[11px] text-muted-foreground truncate max-w-[140px]" title={market.channelToken}>
                                                    tok: {market.channelToken}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20">
                                                {market.currency}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-foreground">
                                            <span className="font-medium uppercase">{market.defaultLanguage}</span>
                                            {market.supportedLanguages && market.supportedLanguages.length > 1 && (
                                                <span className="text-muted-foreground ml-1">
                                                    (+{market.supportedLanguages.length - 1})
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleEnabled(market)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                                                    market.enabled
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                                        : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
                                                }`}
                                            >
                                                {market.enabled ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                                                {market.enabled ? 'Active' : 'Disabled'}
                                            </button>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(market)}
                                                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                                                    title="Edit Market"
                                                >
                                                    <Edit3 className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(market)}
                                                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition cursor-pointer"
                                                    title="Delete Market"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Dialog for Create/Edit */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-background/80 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    {editingMarket ? `Edit Market: ${editingMarket.name}` : 'Create New Market'}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Configure storefront localization, catalog channels, and content.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex border-b border-border bg-muted/40 px-6 gap-2 overflow-x-auto">
                            <button
                                type="button"
                                onClick={() => setActiveTab('basic')}
                                className={`px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                                    activeTab === 'basic'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Globe className="size-3.5" /> Basic Settings
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('navigation')}
                                className={`px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                                    activeTab === 'navigation'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Compass className="size-3.5" /> Navigation
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('homepage')}
                                className={`px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                                    activeTab === 'homepage'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Layers className="size-3.5" /> Homepage
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('merchandising')}
                                className={`px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                                    activeTab === 'merchandising'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Sliders className="size-3.5" /> Merchandising
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('seo')}
                                className={`px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                                    activeTab === 'seo'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Search className="size-3.5" /> SEO
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
                            {activeTab === 'basic' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Market Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={formCode}
                                            onChange={e => setFormCode(e.target.value)}
                                            placeholder="e.g. in, bd, global, ae"
                                            required
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                        />
                                        <span className="text-[11px] text-muted-foreground mt-0.5 block">Unique lowercase slug identifier</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Market Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formName}
                                            onChange={e => setFormName(e.target.value)}
                                            placeholder="e.g. India, Bangladesh, Global"
                                            required
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            URL Prefix
                                        </label>
                                        <input
                                            type="text"
                                            value={formUrlPrefix}
                                            onChange={e => setFormUrlPrefix(e.target.value)}
                                            placeholder="e.g. in or leave blank for root /"
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                        />
                                        <span className="text-[11px] text-muted-foreground mt-0.5 block">Storefront path prefix without slashes</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Vendure Channel *
                                        </label>
                                        {channels.length > 0 ? (
                                            <select
                                                value={formChannelCode}
                                                onChange={e => setFormChannelCode(e.target.value)}
                                                required
                                                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                            >
                                                <option value="">Select a Channel...</option>
                                                {channels.map(ch => (
                                                    <option key={ch.id} value={ch.code}>
                                                        {ch.code} ({ch.token})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={formChannelCode}
                                                onChange={e => setFormChannelCode(e.target.value)}
                                                placeholder="e.g. in-channel, bd-channel"
                                                required
                                                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                            />
                                        )}
                                        <span className="text-[11px] text-muted-foreground mt-0.5 block">Mapped Vendure catalog channel</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            ISO Currency *
                                        </label>
                                        <input
                                            type="text"
                                            value={formCurrency}
                                            onChange={e => setFormCurrency(e.target.value)}
                                            placeholder="e.g. USD, INR, BDT"
                                            required
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Primary Country Code (ISO 3166-1)
                                        </label>
                                        <input
                                            type="text"
                                            value={formCountryCode}
                                            onChange={e => setFormCountryCode(e.target.value)}
                                            placeholder="e.g. IN, BD, US, AE"
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                        />
                                        <span className="text-[11px] text-muted-foreground mt-0.5 block">Primary country for Geo-IP</span>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Country Cluster (comma-separated ISO codes)
                                        </label>
                                        <input
                                            type="text"
                                            value={formSupportedCountryCodes}
                                            onChange={e => setFormSupportedCountryCodes(e.target.value)}
                                            placeholder="e.g. DE, FR, IT, ES or AE, SA, QA, KW, OM, BH"
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                        />
                                        <span className="text-[11px] text-muted-foreground mt-0.5 block">Additional regional countries routed to this market</span>
                                    </div>

                                    {/* Storefront URL Preview Box */}
                                    <div className="sm:col-span-2 p-3.5 rounded-lg bg-primary/5 border border-primary/20">
                                        <span className="text-xs font-semibold text-primary block mb-1">
                                            Storefront URL Preview
                                        </span>
                                        <code className="text-xs font-mono break-all text-primary/90">
                                            https://suisuto.com{formUrlPrefix.trim() ? `/${formUrlPrefix.trim().replace(/^\/+|\/+$/g, '')}` : ''}/products/heritage-silk
                                        </code>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Default Language Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={formDefaultLanguage}
                                            onChange={e => setFormDefaultLanguage(e.target.value)}
                                            placeholder="e.g. en, bn, hi"
                                            required
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground mb-1">
                                            Supported Languages (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={formSupportedLanguages}
                                            onChange={e => setFormSupportedLanguages(e.target.value)}
                                            placeholder="e.g. en, bn, hi"
                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                        />
                                    </div>

                                    <div className="sm:col-span-2 flex flex-wrap items-center gap-6 pt-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={formEnabled}
                                                onChange={e => setFormEnabled(e.target.checked)}
                                                className="rounded border-border text-primary focus:ring-primary size-4"
                                            />
                                            Market Enabled
                                        </label>
                                        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={formIsDefault}
                                                onChange={e => setFormIsDefault(e.target.checked)}
                                                className="rounded border-border text-primary focus:ring-primary size-4"
                                            />
                                            Is Default Fallback Market
                                        </label>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'navigation' && (
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Navigation Configuration (JSON)
                                    </label>
                                    <textarea
                                        rows={14}
                                        value={formNavigationJson}
                                        onChange={e => setFormNavigationJson(e.target.value)}
                                        className="w-full p-3 font-mono text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                    />
                                    <span className="text-xs text-muted-foreground mt-1 block">Structure primary menus, footer columns, and promotional links.</span>
                                </div>
                            )}

                            {activeTab === 'homepage' && (
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Homepage Configuration (JSON)
                                    </label>
                                    <textarea
                                        rows={14}
                                        value={formHomepageJson}
                                        onChange={e => setFormHomepageJson(e.target.value)}
                                        className="w-full p-3 font-mono text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                    />
                                    <span className="text-xs text-muted-foreground mt-1 block">Define hero headlines, CTA URLs, badges, and section sequences.</span>
                                </div>
                            )}

                            {activeTab === 'merchandising' && (
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        Merchandising Configuration (JSON)
                                    </label>
                                    <textarea
                                        rows={14}
                                        value={formMerchandisingJson}
                                        onChange={e => setFormMerchandisingJson(e.target.value)}
                                        className="w-full p-3 font-mono text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                    />
                                    <span className="text-xs text-muted-foreground mt-1 block">Configure featured collection slugs, product order preferences, and pinned categories.</span>
                                </div>
                            )}

                            {activeTab === 'seo' && (
                                <div>
                                    <label className="block text-xs font-medium text-foreground mb-1">
                                        SEO Configuration (JSON)
                                    </label>
                                    <textarea
                                        rows={14}
                                        value={formSeoJson}
                                        onChange={e => setFormSeoJson(e.target.value)}
                                        className="w-full p-3 font-mono text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                    />
                                    <span className="text-xs text-muted-foreground mt-1 block">Configure siteTitle, titleTemplate, defaultMetaDescription, and hreflang maps.</span>
                                </div>
                            )}

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-border flex items-center justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs cursor-pointer"
                                >
                                    {editingMarket ? 'Update Market' : 'Create Market'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
