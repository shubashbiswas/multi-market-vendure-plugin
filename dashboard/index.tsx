import React from 'react';
import { defineDashboardExtension } from '@vendure/dashboard';
import { MarketControlPage } from './market-control-page';

defineDashboardExtension({
    routes: [
        {
            path: '/markets',
            navMenuItem: {
                sectionId: 'settings',
                id: 'markets',
                title: 'Markets',
                order: 160,
            },
            component: () => <MarketControlPage />,
        },
    ],
});
