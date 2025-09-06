// api-gateway/blogPost.controller.ts
import { Body, Controller, Delete, Get, Inject, Param, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ClientProxy } from '@nestjs/microservices'
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/createBlogPost.dto'

@Controller('blogPost')
export class BlogPostController {
  constructor(@Inject('AUTH_SERVICE') private readonly client: ClientProxy) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(@Body() dto: CreateBlogPostDto, @UploadedFile() file?: Express.Multer.File) {
    return this.client.send({ cmd: 'createBlogPost' }, { ...dto, image: file ? file.buffer.toString('base64') : null })
  }

    @Get('doctor/:doctorId')
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.client.send({ cmd: 'findByDoctor' }, doctorId)
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
  @UseInterceptors(FileInterceptor('image'))
  update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto, @UploadedFile() file?: Express.Multer.File) {
    return this.client.send(
      { cmd: 'updateBlogPost' },
      { id, dto: { ...dto, image: file ? file.buffer.toString('base64') : null } }
    )
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.client.send({ cmd: 'removeBlogPost' }, id)
  }
}
