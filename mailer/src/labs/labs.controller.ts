import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { LabsService } from './labs.service';
import { MessagePattern } from '@nestjs/microservices';
import { LabBookingConfirmationDto } from './dtos/lab-booking-confirmation.dto';
import { LabReportCompletionDto } from './dtos/lab-report-completion.dto';
import { ScanReportCompletionDto } from './dtos/scan-report-completion.dto';
import { LabBookingCancellationDto } from './dtos/lab-cancellation-email.dto';

@Controller('labs')

export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @MessagePattern('lab_test_booking_confirmed')
  async handleLabTestBookingConfirmed(data: LabBookingConfirmationDto) {
    return this.labsService.processLabTestBookingConfirmation(data);
  }

  @MessagePattern('thirty_min_reminder_lab_test')
  async handleLabTestThirtyMinReminder(data: LabBookingConfirmationDto) {
    return this.labsService.processLabTestThirtyMinReminder(data);
  }

  @MessagePattern('one_day_reminder_lab_test')
  async handleLabTestOneDayReminder(data: LabBookingConfirmationDto) {
    return this.labsService.processLabTestOneDayReminder(data);
  }

   @MessagePattern('lab_report_available')
  async handleLabReportAvailable(data: LabReportCompletionDto) {
    return this.labsService.processLabReportAvailable(data);
  }

   @MessagePattern('scan_report_available')
  async handleScanReportAvailable(data: ScanReportCompletionDto) {
    return this.labsService.processScanReportAvailable(data);
  }

  @MessagePattern('lab_test_booking_cancelled')
  async handleLabTestBookingCancelled(data: LabBookingCancellationDto) {
    return this.labsService.processLabTestBookingCancellation(data);
  }
}
