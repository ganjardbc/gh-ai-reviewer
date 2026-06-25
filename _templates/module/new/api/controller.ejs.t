---
to: "<%= (target === 'api' || target === 'both') ? 'apps/api/src/' + h.changeCase.param(name) + '/' + h.changeCase.param(name) + '.controller.ts' : '' %>"
---
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { <%= h.changeCase.pascal(name) %>Service } from './<%= h.changeCase.param(name) %>.service';
import { Create<%= h.changeCase.pascal(name) %>Dto } from './dto/create-<%= h.changeCase.param(name) %>.dto';
import { Update<%= h.changeCase.pascal(name) %>Dto } from './dto/update-<%= h.changeCase.param(name) %>.dto';
import { List<%= h.changeCase.pascal(name) %>Dto } from './dto/list-<%= h.changeCase.param(name) %>.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';

@ApiTags('<%= h.changeCase.pascal(name) %>')
@ApiBearerAuth()
@Controller('<%= h.changeCase.param(name) %>')
@UseGuards(PermissionGuard)
export class <%= h.changeCase.pascal(name) %>Controller {
  constructor(private readonly <%= h.changeCase.camel(name) %>Service: <%= h.changeCase.pascal(name) %>Service) {}

  @Post()
  @RequirePermission('<%= h.changeCase.camel(name) %>.create')
  @ApiOperation({ summary: 'Create a new <%= h.changeCase.param(name) %>' })
  @ApiResponse({ status: 201, description: 'Created successfully' })
  create(
    @Body() dto: Create<%= h.changeCase.pascal(name) %>Dto,
    @CurrentUser('merchant_id') merchantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.<%= h.changeCase.camel(name) %>Service.create(dto, merchantId, userId);
  }

  @Get()
  @RequirePermission('<%= h.changeCase.camel(name) %>.read')
  @ApiOperation({ summary: 'List <%= h.changeCase.param(name) %>s' })
  @ApiResponse({ status: 200, description: 'Fetched successfully' })
  findAll(
    @CurrentUser('merchant_id') merchantId: string,
    @Query() query: List<%= h.changeCase.pascal(name) %>Dto,
  ) {
    return this.<%= h.changeCase.camel(name) %>Service.findAll(merchantId, query);
  }

  @Get(':id')
  @RequirePermission('<%= h.changeCase.camel(name) %>.read')
  @ApiOperation({ summary: 'Get <%= h.changeCase.param(name) %> by ID' })
  @ApiResponse({ status: 200, description: 'Fetched detail successfully' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('merchant_id') merchantId: string,
  ) {
    return this.<%= h.changeCase.camel(name) %>Service.findOne(id, merchantId);
  }

  @Patch(':id')
  @RequirePermission('<%= h.changeCase.camel(name) %>.update')
  @ApiOperation({ summary: 'Update <%= h.changeCase.param(name) %>' })
  @ApiResponse({ status: 200, description: 'Updated successfully' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('id') id: string,
    @Body() dto: Update<%= h.changeCase.pascal(name) %>Dto,
    @CurrentUser('merchant_id') merchantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.<%= h.changeCase.camel(name) %>Service.update(id, dto, merchantId, userId);
  }

  @Delete(':id')
  @RequirePermission('<%= h.changeCase.camel(name) %>.delete')
  @ApiOperation({ summary: 'Delete <%= h.changeCase.param(name) %>' })
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser('merchant_id') merchantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.<%= h.changeCase.camel(name) %>Service.remove(id, merchantId, userId);
  }
}
