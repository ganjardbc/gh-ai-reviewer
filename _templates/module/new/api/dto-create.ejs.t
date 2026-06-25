---
to: "<%= (target === 'api' || target === 'both') ? 'apps/api/src/' + h.changeCase.param(name) + '/dto/create-' + h.changeCase.param(name) + '.dto.ts' : '' %>"
---
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class Create<%= h.changeCase.pascal(name) %>Dto {
  @ApiProperty({ example: 'Demo Name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
