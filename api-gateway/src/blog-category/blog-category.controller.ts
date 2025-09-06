// api-gateway/blogCategory.controller.ts
import { Body, Controller, Delete, Get, Inject, Param, Post, Put } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { CreateBlogCategoryDto, UpdateBlogCategoryDto } from './dto/createBlogCategory.dto'

@Controller('blogCategory')
export class BlogCategoryController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly client: ClientProxy
  ) {}

  @Post()
  create(@Body() dto: CreateBlogCategoryDto) {
    return this.client.send({ cmd: 'createBlogCategory' }, dto)
  }

  @Get()
  findAll() {
    return this.client.send({ cmd: 'findAllBlogCategories' }, {})
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.client.send({ cmd: 'findOneBlogCategory' }, id)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBlogCategoryDto) {
    return this.client.send({ cmd: 'updateBlogCategory' }, { id, dto })
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.client.send({ cmd: 'removeBlogCategory' }, id)
  }
}
