import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import { AppointmentsService } from './appointments.service'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { AppointmentMode, AppointmentStatus, AppointmentTypes } from './appointment.enums'

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.svc.create(dto)
  }

  @Get()
  findAll(
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('type') type?: AppointmentTypes,
    @Query('mode') mode?: AppointmentMode,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.findAll({
      patientId,
      doctorId,
      status,
      type,
      mode,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    })
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.findOne(id)
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAppointmentDto) {
    return this.svc.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.remove(id)
  }

  @Get('doctor/:doctorId')
findAllByDoctor(
  @Param('doctorId', new ParseUUIDPipe()) doctorId: string,
  @Query('status') status?: AppointmentStatus,
  @Query('from') from?: string,
  @Query('to') to?: string,
  @Query('limit') limit?: string,
  @Query('offset') offset?: string,
) {
  return this.svc.findAll({
    doctorId,
    status,
    from,
    to,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  })
}

@Get('patient/:patientId')
findAllByPatient(
  @Param('patientId', new ParseUUIDPipe()) patientId: string,
  @Query('status') status?: AppointmentStatus,
  @Query('from') from?: string,
  @Query('to') to?: string,
  @Query('limit') limit?: string,
  @Query('offset') offset?: string,
) {
  return this.svc.findAll({
    patientId,
    status,
    from,
    to,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  })
}


}
