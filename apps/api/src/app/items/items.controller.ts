import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ItemsService } from './items.service';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll() {
    return this.itemsService.findAll();
  }

  // Vulnerable search endpoint — passes the query straight into raw SQL.
  @Get('search')
  search(@Query('name') name: string) {
    return this.itemsService.searchByName(name ?? '');
  }

  // Vulnerable proxy endpoint — fetches any URL the caller provides (SSRF).
  @Get('proxy')
  proxy(@Req() req: { query: { url: string } }) {
    return this.itemsService.fetchExternal(req);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(Number(id));
  }

  @Post()
  create(@Body() body: { name: string; price: number }) {
    return this.itemsService.create(body.name, Number(body.price));
  }

  // Vulnerable create — binds the whole request body (mass assignment).
  @Post('bulk')
  createFromBody(@Req() req: { body: Record<string, unknown> }) {
    return this.itemsService.createFromBody(req);
  }
}
