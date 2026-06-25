---
to: "<%= (target === 'web' || target === 'both') ? 'apps/web/src/modules/' + h.changeCase.param(name) + '/services/rbac.ts' : '' %>"
---
export const READ = '<%= h.changeCase.camel(name) %>.read';
export const CREATE = '<%= h.changeCase.camel(name) %>.create';
export const DELETE = '<%= h.changeCase.camel(name) %>.delete';
export const UPDATE = '<%= h.changeCase.camel(name) %>.update';

export const PERMISSIONS = [
  READ,
  CREATE,
  DELETE,
  UPDATE,
];
