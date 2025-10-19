import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

   @MessagePattern('appointment_created')
  handleAppointment(@Payload() data: any) {
    console.log('New appointment received:', data);
    // Schedule notification or any logic here
  }
}
