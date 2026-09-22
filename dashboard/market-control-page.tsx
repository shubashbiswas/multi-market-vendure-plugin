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
} from 'lucide-react';

interface MarketItem {
    id: string;
    code: string;
    name: string;
    countryCode?: string;
    currency: string;
    defaultLanguage: string;
    supportedLanguages?: string[];
    urlPrefix: string;
    channelCode: string;
    enabled: boolean;
    isDefault: boolean;
    navigation?: any;
    homepage?: any;
    merchandising?: any;
    content?: any;
    seo?: any;
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
            currency
            defaultLanguage
            supportedLanguages
            urlPrefix
            channelCode
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingMarket, setEditingMarket] = useState<MarketItem | null>(null);
    const [activeTab, setActiveTab] = useState<'basic' | 'navigation' | 'homepage' | 'merchandising' | 'seo'>('basic');

    // Form fields
    const [formCode, setFormCode] = useState('');
    const [formName, setFormName] = useState('');
    const [formCountryCode, setFormCountryCode] = useState('');
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
            const data = await executeGql(GET_ADMIN_MARKETS_QUERY, { enabledOnly: false });
            if (data?.adminMarkets) {
                setMarkets(data.adminMarkets);
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
        setFormCurrency('USD');
        setFormDefaultLanguage('en');
        setFormSupportedLanguages('en');
        setFormUrlPrefix('');
        setFormChannelCode('');
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

            if (editingMarket) {
                await executeGql(UPDATE_MARKET_MUTATION, {
                    input: {
                        id: editingMarket.id,
                        code: formCode,
                        name: formName,
                        countryCode: formCountryCode.trim().toUpperCase() || null,
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

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <Globe size={28} color="#2563eb" /> Multi-Market Configuration
                    </h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>
                        Configure regional storefront markets, URL routing prefixes, Vendure channel mappings, and market-specific content.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {markets.length === 0 && (
                        <button
                            onClick={handleSeedDefaults}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                background: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 500,
                            }}
                        >
                            <RefreshCw size={16} /> Seed Default Markets
                        </button>
                    )}
                    <button
                        onClick={openCreateModal}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 500,
                        }}
                    >
                        <Plus size={16} /> Add Market
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}
            {successMessage && (
                <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} /> {successMessage}
                </div>
            )}

            {/* Market List Table */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                            <th style={{ padding: '12px 16px' }}>Market</th>
                            <th style={{ padding: '12px 16px' }}>Code</th>
                            <th style={{ padding: '12px 16px' }}>URL Prefix</th>
                            <th style={{ padding: '12px 16px' }}>Vendure Channel</th>
                            <th style={{ padding: '12px 16px' }}>Currency</th>
                            <th style={{ padding: '12px 16px' }}>Languages</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                                    Loading markets...
                                </td>
                            </tr>
                        ) : markets.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                    <Globe size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                                    No markets configured yet. Click "Seed Default Markets" or "Add Market" to begin.
                                </td>
                            </tr>
                        ) : (
                            markets.map(market => (
                                <tr key={market.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {market.name}
                                            {market.isDefault && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '999px' }}>
                                                    <Star size={12} /> Default
                                                </span>
                                            )}
                                        </div>
                                        {market.countryCode && (
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>Country: {market.countryCode}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                                        {market.code}
                                    </td>
                                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#2563eb' }}>
                                        {market.urlPrefix ? `/${market.urlPrefix}/` : '/ (root)'}
                                    </td>
                                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#475569' }}>
                                        {market.channelCode}
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' }}>
                                            {market.currency}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                                        {market.defaultLanguage.toUpperCase()}
                                        {market.supportedLanguages && market.supportedLanguages.length > 1 && (
                                            <span style={{ color: '#94a3b8', marginLeft: '4px' }}>
                                                (+{market.supportedLanguages.length - 1})
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <button
                                            onClick={() => handleToggleEnabled(market)}
                                            style={{
                                                background: market.enabled ? '#dcfce7' : '#f1f5f9',
                                                color: market.enabled ? '#15803d' : '#64748b',
                                                border: 'none',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}
                                        >
                                            {market.enabled ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                                            {market.enabled ? 'Active' : 'Disabled'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => openEditModal(market)}
                                                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '4px' }}
                                                title="Edit Market"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(market)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                title="Delete Market"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Dialog for Create/Edit */}
            {isCreateOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '10px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        {/* Modal Header */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                                {editingMarket ? `Edit Market: ${editingMarket.name}` : 'Create New Market'}
                            </h2>
                            <button onClick={() => setIsCreateOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 24px' }}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('basic')}
                                style={{ padding: '12px 16px', border: 'none', background: 'none', borderBottom: activeTab === 'basic' ? '2px solid #2563eb' : 'none', color: activeTab === 'basic' ? '#2563eb' : '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Globe size={16} /> Settings
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('navigation')}
                                style={{ padding: '12px 16px', border: 'none', background: 'none', borderBottom: activeTab === 'navigation' ? '2px solid #2563eb' : 'none', color: activeTab === 'navigation' ? '#2563eb' : '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Compass size={16} /> Navigation
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('homepage')}
                                style={{ padding: '12px 16px', border: 'none', background: 'none', borderBottom: activeTab === 'homepage' ? '2px solid #2563eb' : 'none', color: activeTab === 'homepage' ? '#2563eb' : '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Layers size={16} /> Homepage
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('merchandising')}
                                style={{ padding: '12px 16px', border: 'none', background: 'none', borderBottom: activeTab === 'merchandising' ? '2px solid #2563eb' : 'none', color: activeTab === 'merchandising' ? '#2563eb' : '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Sliders size={16} /> Merchandising
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('seo')}
                                style={{ padding: '12px 16px', border: 'none', background: 'none', borderBottom: activeTab === 'seo' ? '2px solid #2563eb' : 'none', color: activeTab === 'seo' ? '#2563eb' : '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Search size={16} /> SEO
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {activeTab === 'basic' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            Market Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={formCode}
                                            onChange={e => setFormCode(e.target.value)}
                                            placeholder="e.g. in, bd, global, ae"
                                            required
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>Unique lowercase identifier</span>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            Market Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formName}
                                            onChange={e => setFormName(e.target.value)}
                                            placeholder="e.g. India, Bangladesh, Global"
                                            required
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            URL Prefix
                                        </label>
                                        <input
                                            type="text"
                                            value={formUrlPrefix}
                                            onChange={e => setFormUrlPrefix(e.target.value)}
                                            placeholder="e.g. in or leave blank for root /"
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>Storefront route prefix without slashes</span>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            Vendure Channel Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={formChannelCode}
                                            onChange={e => setFormChannelCode(e.target.value)}
                                            placeholder="e.g. in-channel, bd-channel"
                                            required
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            ISO Currency *
                                        </label>
                                        <input
                                            type="text"
                                            value={formCurrency}
                                            onChange={e => setFormCurrency(e.target.value)}
                                            placeholder="e.g. USD, INR, BDT"
                                            required
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            Country Code (ISO 3166-1)
                                        </label>
                                        <input
                                            type="text"
                                            value={formCountryCode}
                                            onChange={e => setFormCountryCode(e.target.value)}
                                            placeholder="e.g. IN, BD, US, AE"
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>Used for Geo-IP recommendation matching</span>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            Default Language Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={formDefaultLanguage}
                                            onChange={e => setFormDefaultLanguage(e.target.value)}
                                            placeholder="e.g. en, bn, hi"
                                            required
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                            Supported Languages (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={formSupportedLanguages}
                                            onChange={e => setFormSupportedLanguages(e.target.value)}
                                            placeholder="e.g. en, bn, hi"
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 2', marginTop: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                                            <input
                                                type="checkbox"
                                                checked={formEnabled}
                                                onChange={e => setFormEnabled(e.target.checked)}
                                            /> Enabled
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, marginLeft: '24px' }}>
                                            <input
                                                type="checkbox"
                                                checked={formIsDefault}
                                                onChange={e => setFormIsDefault(e.target.checked)}
                                            /> Is Default Fallback Market
                                        </label>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'navigation' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                        Navigation Configuration (JSON)
                                    </label>
                                    <textarea
                                        rows={14}
                                        value={formNavigationJson}
                                        onChange={e => setFormNavigationJson(e.target.value)}
                                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Structure primary menus, footer columns, and promotional links.</span>
                                </div>
                            )}

                            {activeTab === 'homepage' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                        Homepage Configuration (JSON)
                                    </label>
                                    <textarea
                                        rows={14}
                                        value={formHomepageJson}
                                        onChange={e => setFormHomepageJson(e.target.value)}
                                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Define hero headlines, CTA URLs, badges, and section sequences.</span>
                                </div>
                            )}

                            {activeTab === 'merchandising' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                        Merchandising Configuration (JSON)
                                    </label>
                                    <textarea
                                        rows={14}
                                        value={formMerchandisingJson}
                                        onChange={e => setFormMerchandisingJson(e.target.value)}
                                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Configure featured collection slugs, product order preferences, and pinned categories.</span>
                                </div>
                            )}

                            {activeTab === 'seo' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                        SEO Configuration (JSON)
                                    </label>
                                    <textarea
                                        rows={14}
                                        value={formSeoJson}
                                        onChange={e => setFormSeoJson(e.target.value)}
                                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Configure siteTitle, titleTemplate, defaultMetaDescription, and hreflang maps.</span>
                                </div>
                            )}

                            {/* Modal Footer */}
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
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
