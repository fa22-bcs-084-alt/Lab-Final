// api-gateway/blogPost.controller.ts
import { Body, Controller, Delete, Get, Inject, Param, Post, Put } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/createBlogPost.dto'

@Controller('blogPost')
export class BlogPostController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly client: ClientProxy
  ) {}

  @Post()
  create(@Body() dto: CreateBlogPostDto) {
    return this.client.send({ cmd: 'createBlogPost' }, dto)
  }

  @Get()
  findAll() {
    return this.client.send({ cmd: 'findAllBlogPosts' }, {})
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.client.send({ cmd: 'findOneBlogPost' }, id)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.client.send({ cmd: 'updateBlogPost' }, { id, dto })
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.client.send({ cmd: 'removeBlogPost' }, id)
  }
}
