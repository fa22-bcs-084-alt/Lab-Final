import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { LabTestsService } from './lab-tests.service'

@Controller()
export class LabTestsController {
  constructor(private readonly labTestsService: LabTestsService) {}

  @MessagePattern({ cmd: 'createLabTest' })
  async create(@Payload() dto: any) {
    return this.labTestsService.createTest(dto)
  }

  @MessagePattern({ cmd: 'getAllLabTests' })
  async findAll() {
    return this.labTestsService.getAllTests()
  }

  @MessagePattern({ cmd: 'getLabTestById' })
  async findOne(@Payload() id: string) {
    return this.labTestsService.getTestById(id)
  }

  @MessagePattern({ cmd: 'updateLabTest' })
  async update(@Payload() data: { id: string; dto: any }) {
    return this.labTestsService.updateTest(data.id, data.dto)
  }

  @MessagePattern({ cmd: 'deleteLabTest' })
  async remove(@Payload() id: string) {
    return this.labTestsService.deleteTest(id)
  }
}
