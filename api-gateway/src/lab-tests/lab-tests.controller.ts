import { Controller, Get, Post, Patch, Delete, Param, Body, Inject } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Controller('lab-tests')
export class LabTestsController {
  constructor(
    @Inject('LAB_TESTS_SERVICE') private readonly labTestsClient: ClientProxy,
  ) {}

  @Post()
  async create(@Body() dto: any) {
    return firstValueFrom(this.labTestsClient.send({ cmd: 'createLabTest' }, dto))
  }

  @Get()
  async findAll() {
    return firstValueFrom(this.labTestsClient.send({ cmd: 'getAllLabTests' }, {}))
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return firstValueFrom(this.labTestsClient.send({ cmd: 'getLabTestById' }, id))
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return firstValueFrom(this.labTestsClient.send({ cmd: 'updateLabTest' }, { id, dto }))
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return firstValueFrom(this.labTestsClient.send({ cmd: 'deleteLabTest' }, id))
  }
}
