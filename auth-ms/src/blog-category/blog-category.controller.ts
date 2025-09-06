// src/blogCategory/blogCategory.controller.ts
import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { BlogCategoryService } from './blog-category.service'
import { CreateBlogCategoryDto, UpdateBlogCategoryDto } from './dto/createBlogCategory.dto'

@Controller()
export class BlogCategoryController {
  constructor(private readonly service: BlogCategoryService) {}

  @MessagePattern({ cmd: 'createBlogCategory' })
  create(@Payload() dto: CreateBlogCategoryDto) {
    return this.service.create(dto)
  }

  @MessagePattern({ cmd: 'findAllBlogCategories' })
  findAll() {
    return this.service.findAll()
  }

  @MessagePattern({ cmd: 'findOneBlogCategory' })
  findOne(@Payload() id: string) {
    return this.service.findOne(id)
  }

  @MessagePattern({ cmd: 'updateBlogCategory' })
  update(@Payload() data: { id: string; dto: UpdateBlogCategoryDto }) {
    return this.service.update(data.id, data.dto)
  }

  @MessagePattern({ cmd: 'removeBlogCategory' })
  remove(@Payload() id: string) {
    return this.service.remove(id)
  }
}
