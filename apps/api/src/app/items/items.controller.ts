import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ItemsService } from './items.service';

// KEUR-EXPECT: SEC-011
// KEUR-CATEGORY: security
// KEUR-OWASP: A03-injection
// KEUR-NOTE: self-authored (mestjs), verified `keur scan` 2026-09-26. The eval()
//   on user input (calc endpoint) fires SEC-011 (dangerous pattern). The inline
//   comment historically named KEUR-SEC-004 (dynamic-exec) as the intended rule;
//   keur actually flags it via SEC-011 — label reflects reality, not intent.
// KEUR-NOTE: state-changing logic behind @Get (search/proxy/calc) is itself a
//   NestJS antipattern (CSRF-bypassable); tracked in the framework-antipattern set.

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

  // Vulnerable calculator — evaluates a user expression (code injection).
  @Get('calc')
  calc(@Query('expr') expr: string) {
    // INTENTIONAL (KEUR-SEC-004): eval() on user input — remote code execution
    // eslint-disable-next-line no-eval
    const result = eval(expr);
    return { expr, result };
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
