// src/blogPost/blogPost.controller.ts
import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { BlogPostService } from './blog-post.service'
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/createBlogPost.dto'

@Controller()
export class BlogPostController {
  constructor(private readonly service: BlogPostService) {}

  @MessagePattern({ cmd: 'createBlogPost' })
  create(@Payload() dto: CreateBlogPostDto) {
    return this.service.create(dto)
  }

  @MessagePattern({ cmd: 'findAllBlogPosts' })
  findAll() {
    return this.service.findAll()
  }

  @MessagePattern({ cmd: 'findOneBlogPost' })
  findOne(@Payload() id: string) {
    return this.service.findOne(id)
  }

  @MessagePattern({ cmd: 'updateBlogPost' })
  update(@Payload() data: { id: string; dto: UpdateBlogPostDto }) {
    return this.service.update(data.id, data.dto)
  }

  @MessagePattern({ cmd: 'removeBlogPost' })
  remove(@Payload() id: string) {
    return this.service.remove(id)
  }
}
