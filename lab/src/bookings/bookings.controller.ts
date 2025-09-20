import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { BookingsService } from './bookings.service'

@Controller()
export class BookingsController {
  constructor(private readonly bookedLabTestsService: BookingsService) {}

  @MessagePattern({ cmd: 'book_test' })
  async bookTest(
    @Payload()
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

  @MessagePattern({ cmd: 'get_patient_bookings' })
  async getPatientBookings(@Payload() patientId: string) {
    return this.bookedLabTestsService.getBookingsByPatient(patientId)
  }

  @MessagePattern({ cmd: 'cancel_booking' })
  async cancelBooking(@Payload() bookingId: string) {
    return this.bookedLabTestsService.cancelBooking(bookingId)
  }

  @MessagePattern({ cmd: 'get_technician_bookings' })
  async getTechnicianBookings(@Payload() techId: string) {
    return this.bookedLabTestsService.getBookingsByTechnician(techId)
  }

@MessagePattern({ cmd: 'upload_scan' })
async uploadScan(
  @Payload()
  data: {
    bookingId: string
    fileBuffer: string // base64
    fileName: string
    doctor_name?: string
  }
) {
  const buffer = Buffer.from(data.fileBuffer, 'base64');
  return this.bookedLabTestsService.uploadScan(
    data.bookingId,
    buffer,
    data.fileName,
    data.doctor_name
  );
}


  @MessagePattern({ cmd: 'upload_result' })
  async uploadResult(
    @Payload()
    body: {
      bookingId: string
      doctor_name?: string
      title: string
      resultData: any[]
    }
  ) {
    return this.bookedLabTestsService.uploadResult(body.bookingId, body)
  }
}
