---
to: "<%= (target === 'web' || target === 'both') ? 'apps/web/src/modules/' + h.changeCase.param(name) + '/router/index.ts' : '' %>"
---


import {
  PREFIX_ROUTE_PATH,
  PREFIX_ROUTE_NAME
} from '@/modules/<%=h.changeCase.param(name)%>/services/constants';

export default [
  {
    path: PREFIX_ROUTE_PATH,
    name: PREFIX_ROUTE_NAME,
    component: () => import('@/modules/<%=h.changeCase.param(name)%>/pages/index.vue'),
    meta: {
      title: '<%=h.changeCase.title(name)%>',
      layout: 'default',
      breadcrumbs: [
        {
          label: 'Home',
          route: '/',
          isActive: false,
        },
        {
          label: '<%=h.changeCase.title(name)%>',
          route: PREFIX_ROUTE_PATH,
          isActive: true,
        },
      ]
    }
  },
];
