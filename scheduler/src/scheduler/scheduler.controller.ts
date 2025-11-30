import { Controller, UsePipes, ValidationPipe } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { SchedulerService } from './scheduler.service'
import { AppointmentDto } from 'src/dto/appointment.dto'
import { LabBookingConfirmationDto } from 'src/dto/lab-booking-confirmation.dto'
import { AppointmentCancellationDto } from 'src/dto/appointment-cancellation.dto'

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @MessagePattern('appointment_created')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleAppointment(@Payload() data: AppointmentDto) {
    await this.schedulerService.handleAppointment(data)
  }

  @MessagePattern('appointment_cancelled')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleAppointmentCancellation(@Payload() data: AppointmentCancellationDto) {
    await this.schedulerService.handleAppointmentCancellation(data)
  }


   @MessagePattern('lab_test_booking_confirmed')
  
      async handleLabBooking(@Payload() data: LabBookingConfirmationDto) {
        await this.schedulerService.handleLabBooking(data)
      }
}
