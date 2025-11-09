import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { MessagePattern, Payload } from '@nestjs/microservices'
import { AppointmentDto } from 'src/dto/appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}
  
  @MessagePattern('appointment_created')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleAppointment(@Payload() data: AppointmentDto) {
   await this.appointmentsService.handleAppointment(data)
    
  }

  //handle cancel notification thing

    @MessagePattern('thirty_min_reminder')
     @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleThirtyMinAppointmentReminder(@Payload() data: AppointmentDto) {

   await this.appointmentsService.handleThirtyMinAppointmentReminder(data)

  }

  @MessagePattern('one_day_reminder')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleOneDayAppointmentReminder(@Payload() data: AppointmentDto) {
   await this.appointmentsService.handleOneDayAppointmentReminder(data)
  }
}






