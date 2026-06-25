---
to: "<%= (target === 'api' || target === 'both') ? 'apps/api/src/' + h.changeCase.param(name) + '/dto/update-' + h.changeCase.param(name) + '.dto.ts' : '' %>"
---
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class Update<%= h.changeCase.pascal(name) %>Dto {
  @ApiPropertyOptional({ example: 'Updated Demo Name' })
  @IsString()
  @IsOptional()
  name?: string;
}
