---
to: "<%= (target === 'api' || target === 'both') ? 'apps/api/src/' + h.changeCase.param(name) + '/' + h.changeCase.param(name) + '.service.ts' : '' %>"
---
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Create<%= h.changeCase.pascal(name) %>Dto } from './dto/create-<%= h.changeCase.param(name) %>.dto';
import { Update<%= h.changeCase.pascal(name) %>Dto } from './dto/update-<%= h.changeCase.param(name) %>.dto';
import { List<%= h.changeCase.pascal(name) %>Dto } from './dto/list-<%= h.changeCase.param(name) %>.dto';

@Injectable()
export class <%= h.changeCase.pascal(name) %>Service {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: Create<%= h.changeCase.pascal(name) %>Dto, merchantId: string, userId: string) {
    // Ensure you scope with merchantId
    // const new<%= h.changeCase.pascal(name) %> = await this.prisma.<%= h.changeCase.camel(name) %>.create({
    //   data: {
    //     ...dto,
    //     merchant_id: merchantId,
    //   },
    // });
    // return new<%= h.changeCase.pascal(name) %>;
    return {
      message: 'Scaffold created successfully',
      data: dto,
      merchantId,
      userId,
    };
  }

  async findAll(merchantId: string, query: List<%= h.changeCase.pascal(name) %>Dto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    // const where = { merchant_id: merchantId };
    // const [data, total] = await Promise.all([
    //   this.prisma.<%= h.changeCase.camel(name) %>.findMany({
    //     where,
    //     skip,
    //     take: limit,
    //     orderBy: { created_at: 'desc' },
    //   }),
    //   this.prisma.<%= h.changeCase.camel(name) %>.count({ where }),
    // ]);
    // return { data, meta: { total, page, limit } };

    return {
      data: [],
      meta: { total: 0, page, limit },
    };
  }

  async findOne(id: string, merchantId: string) {
    // const item = await this.prisma.<%= h.changeCase.camel(name) %>.findFirst({
    //   where: { id, merchant_id: merchantId },
    // });
    // if (!item) throw new NotFoundException('<%= h.changeCase.pascal(name) %> not found');
    // return item;

    return {
      id,
      merchantId,
      message: 'Scaffold details',
    };
  }

  async update(id: string, dto: Update<%= h.changeCase.pascal(name) %>Dto, merchantId: string, userId: string) {
    await this.findOne(id, merchantId);
    // const updated = await this.prisma.<%= h.changeCase.camel(name) %>.update({
    //   where: { id },
    //   data: dto,
    // });
    // return updated;

    return {
      id,
      data: dto,
      merchantId,
      userId,
      message: 'Scaffold updated',
    };
  }

  async remove(id: string, merchantId: string, userId: string) {
    await this.findOne(id, merchantId);
    // await this.prisma.<%= h.changeCase.camel(name) %>.delete({
    //   where: { id },
    // });

    return {
      id,
      merchantId,
      userId,
      message: 'Scaffold deleted',
    };
  }
}
