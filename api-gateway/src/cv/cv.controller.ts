import { 
  Controller, Get, Post, Body, Param, Put, Delete, Inject, 
  UseInterceptors, UploadedFile 
} from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { FileInterceptor } from '@nestjs/platform-express'
import { firstValueFrom } from 'rxjs'

@Controller('cv')
export class CvController {
  constructor(@Inject('AUTH_SERVICE') private readonly cvClient: ClientProxy) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(@UploadedFile() file: Express.Multer.File, @Body() dto: any) {
    // forward dto + file.buffer + file.mimetype
    return firstValueFrom(
      this.cvClient.send({ cmd: 'create_cv' }, { dto, file: { buffer: file?.buffer, mimetype: file?.mimetype } }),
    )
  }

  @Get()
  async findAll() {
    return firstValueFrom(this.cvClient.send({ cmd: 'find_all_cv' }, {}))
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return firstValueFrom(this.cvClient.send({ cmd: 'find_one_cv' }, id))
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  async update(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() dto: any) {
    return firstValueFrom(
      this.cvClient.send(
        { cmd: 'update_cv' },
        { id, dto, file: file ? { buffer: file.buffer, mimetype: file.mimetype } : null },
      ),
    )
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return firstValueFrom(this.cvClient.send({ cmd: 'remove_cv' }, id))
  }
}
