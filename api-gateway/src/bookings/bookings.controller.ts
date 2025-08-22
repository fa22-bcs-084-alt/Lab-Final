import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  UploadedFile,
  UseInterceptors,
  Inject
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ClientProxy } from '@nestjs/microservices'

@Controller('booked-lab-tests')
export class BookingsController {


  constructor(@Inject('LABS') private client: ClientProxy) {}

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
    return this.client.send({ cmd: 'book_test' }, body)
  }

  @Get('patient/:patientId')
  async getPatientBookings(@Param('patientId') patientId: string) {
    return this.client.send({ cmd: 'get_patient_bookings' }, patientId)
  }

  @Patch(':id/cancel')
  async cancelBooking(@Param('id') bookingId: string) {
    return this.client.send({ cmd: 'cancel_booking' }, bookingId)
  }

  @Get('technician/:techId')
  async getTechnicianBookings(@Param('techId') techId: string) {
    return this.client.send({ cmd: 'get_technician_bookings' }, techId)
  }

  @Post(':id/upload-scan')
  @UseInterceptors(FileInterceptor('file'))
  async uploadScan(
    @Param('id') bookingId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('doctor_name') doctor_name?: string
  ) {
    return this.client.send(
      { cmd: 'upload_scan' },
      { bookingId, file, doctor_name }
    )
  }

  @Post(':id/upload-result')
  async uploadResult(
    @Param('id') bookingId: string,
    @Body()
    body: {
      doctor_name?: string
      title: string
      resultData: string
    }
  ) {
    return this.client.send(
      { cmd: 'upload_result' },
      { bookingId, ...body }
    )
  }
}
