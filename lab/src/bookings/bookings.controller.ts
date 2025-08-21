import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  UploadedFile,
  UseInterceptors,
  Query
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { BookingsService } from './bookings.service'

@Controller('booked-lab-tests')
export class BookingsController {
  constructor(private readonly bookedLabTestsService: BookingsService) {}

  // Patient books a test
  @Post()
  async bookTest(
    @Body()
    body: {
      testId: string
      patientId: string
      scheduledDate: string
      scheduledTime: string
      location?: string
      instructions?: string[]
    }
  ) {
    return this.bookedLabTestsService.bookTest(body)
  }

  // Patient views their bookings
  @Get('patient/:patientId')
  async getPatientBookings(@Param('patientId') patientId: string) {
    return this.bookedLabTestsService.getBookingsByPatient(patientId)
  }

  // Patient cancels a booking
  @Patch(':id/cancel')
  async cancelBooking(@Param('id') bookingId: string) {
    return this.bookedLabTestsService.cancelBooking(bookingId)
  }

  // Lab technician views assigned bookings
  @Get('technician/:techId')
  async getTechnicianBookings(@Param('techId') techId: string) {
    return this.bookedLabTestsService.getBookingsByTechnician(techId)
  }

  // Lab technician uploads scan (direct file)
  @Post(':id/upload-scan')
  @UseInterceptors(FileInterceptor('file'))
  async uploadScan(
    @Param('id') bookingId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('doctorName') doctorName?: string
  ) {
    return this.bookedLabTestsService.uploadScan(bookingId, file, doctorName)
  }

  // Lab technician uploads test results (generate PDF)
  @Post(':id/upload-result')
  async uploadResult(
    @Param('id') bookingId: string,
    @Body()
    body: {
      doctorName?: string
      title: string
      resultData: string
    }
  ) {
    return this.bookedLabTestsService.uploadResult(bookingId, body)
  }
}
