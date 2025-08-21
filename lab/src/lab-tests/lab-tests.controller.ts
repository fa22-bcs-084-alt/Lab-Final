import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common'
import { LabTestsService } from './lab-tests.service'

@Controller('lab-tests')
export class LabTestsController {
  constructor(private readonly labTestsService: LabTestsService) {}

  @Post()
  async create(@Body() dto: any) {
    return this.labTestsService.createTest(dto)
  }

  @Get()
  async findAll() {
    return this.labTestsService.getAllTests()
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.labTestsService.getTestById(id)
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.labTestsService.updateTest(id, dto)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.labTestsService.deleteTest(id)
  }
}
