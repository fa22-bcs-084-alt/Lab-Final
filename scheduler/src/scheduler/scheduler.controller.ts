import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { SchedulerService } from './scheduler.service'

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @MessagePattern('appointment_created')
  async handleAppointment(@Payload() data: any) {
    console.log('New appointment received:', data)
    await this.schedulerService.handleAppointment(data)
  }
}
