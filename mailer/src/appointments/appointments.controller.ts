import { Controller } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { MessagePattern, Payload } from '@nestjs/microservices'

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}
  
  @MessagePattern('appointment_created')
  async handleAppointment(@Payload() data: any) {
   await this.appointmentsService.handleAppointment(data)
    
  }
}






