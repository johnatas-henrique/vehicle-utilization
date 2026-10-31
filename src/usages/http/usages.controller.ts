import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { UsageView } from '../domain/usage.js';
import { UsagesService } from '../application/usages.service.js';
import { createUsageSchema, type CreateUsageInput } from './usage.schemas.js';

@Controller('usages')
export class UsagesController {
  constructor(private readonly usagesService: UsagesService) {}

  @Post()
  create(
    @Body({ schema: createUsageSchema }) body: CreateUsageInput,
  ): Promise<UsageView> {
    return this.usagesService.create(body);
  }

  @Post(':id/finish')
  @HttpCode(200)
  finish(@Param('id') id: string): Promise<UsageView> {
    return this.usagesService.finish(id);
  }

  @Get()
  list(): Promise<UsageView[]> {
    return this.usagesService.list();
  }
}
