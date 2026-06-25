---
to: "<%= (target === 'api' || target === 'both') ? 'apps/api/src/' + h.changeCase.param(name) + '/' + h.changeCase.param(name) + '.module.ts' : '' %>"
---
import { Module } from '@nestjs/common';
import { <%= h.changeCase.pascal(name) %>Controller } from './<%= h.changeCase.param(name) %>.controller';
import { <%= h.changeCase.pascal(name) %>Service } from './<%= h.changeCase.param(name) %>.service';

@Module({
  controllers: [<%= h.changeCase.pascal(name) %>Controller],
  providers: [<%= h.changeCase.pascal(name) %>Service],
  exports: [<%= h.changeCase.pascal(name) %>Service],
})
export class <%= h.changeCase.pascal(name) %>Module {}
