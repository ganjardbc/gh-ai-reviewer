---
to: "<%= (target === 'api' || target === 'both') ? 'apps/api/src/' + h.changeCase.param(name) + '/dto/list-' + h.changeCase.param(name) + '.dto.ts' : '' %>"
---
import { PaginationDto } from '../../common/dto/pagination.dto';

export class List<%= h.changeCase.pascal(name) %>Dto extends PaginationDto {}
