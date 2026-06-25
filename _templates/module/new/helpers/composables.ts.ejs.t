---
to: "<%= (target === 'web' || target === 'both') ? 'apps/web/src/modules/' + h.changeCase.param(name) + '/composables/composables.ts' : '' %>"
---
// Place your composables in here