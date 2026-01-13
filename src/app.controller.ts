import { BadRequestException, Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('navigation')
  async getNavigation() {
    return this.appService.getNavigation();
  }

  @Get('bestsellers')
  async getBestsellers() {
    return this.appService.getBestsellers();
  }

  @Get('search')
  async searchProduct(@Query('q') query: string) {
    if (!query) throw new BadRequestException('Query parameter "q" is required');
    return await this.appService.searchAndScrapeProduct(query);
  }

  @Get('category/:slug')
  async getProducts(
    @Param('slug') slug: string,
    @Query('loadMore') loadMore?: string
  ) {
    const isLoadMore = loadMore === 'true';
    return this.appService.getProductsByCategory(slug, isLoadMore);
  }

  // ✅ FIXED: Changed from @Get to @Post and use @Body correctly
  @Post('history')
  async getHistory(@Body() body: { ids: string[] | number[] }) {
    if (!body.ids || !Array.isArray(body.ids)) {
      throw new BadRequestException('Request body must contain "ids" array');
    }
    return this.appService.getProductsByIds(body.ids as string[]);
  }
}