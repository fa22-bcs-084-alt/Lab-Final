import { Controller, UsePipes, ValidationPipe } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { SchedulerService } from './scheduler.service'
import { AppointmentDto } from 'src/dto/appointment.dto'

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @MessagePattern('appointment_created')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleAppointment(@Payload() data: AppointmentDto) {
    await this.schedulerService.handleAppointment(data)
  }
}
