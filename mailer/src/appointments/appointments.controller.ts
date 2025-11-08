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

  //handle cancel notification thing

    @MessagePattern('thirty_min_reminder')
  async handleThirtyMinAppointmentReminder(@Payload() data: any) {
  // await this.appointmentsService.handleThirtyMinAppointmentReminder(data)

  }

    @MessagePattern('one_day_reminder')
  async handleOneDayAppointmentReminder(@Payload() data: any) {
   //await this.appointmentsService.handleOneDayAppointmentReminder(data)

  }
}






