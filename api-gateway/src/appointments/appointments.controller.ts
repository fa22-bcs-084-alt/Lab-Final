import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { AppointmentMode, AppointmentStatus, AppointmentTypes } from './appointment.enums'
import { CompleteNutritionistAppointmentDto } from './dto/complete-nutritionist-appointment.dto'
import { firstValueFrom } from 'rxjs'
import { AvailableSlotsQueryDto } from './dto/available-slots.dto'

@Controller('appointments')
export class AppointmentsController {
  constructor(
    @Inject('APPOINTMENTS_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Get("/available-slots")
async getAvailableSlots(@Query() query: AvailableSlotsQueryDto) {
  const { providerId, role, date } = query
  console.log(query)
  return await firstValueFrom(
    this.client.send({ cmd: "get_available_slots" },query)
  )
}


  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.client.send({ cmd: 'create_appointment' }, dto)
  }


   @Get('patient')
  async getAppointmentsByPatient(@Query('patientId') patientId: string) {
     return this.client.send({ cmd: 'get_appointments_for_patient' },  patientId)
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
    return this.client.send({ cmd: 'find_all_appointments' }, {
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
    return this.client.send({ cmd: 'find_one_appointment' }, id)
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAppointmentDto) {
    console.log("appointment dto=",dto)
    return this.client.send({ cmd: 'update_appointment' }, { id, dto })
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.client.send({ cmd: 'remove_appointment' }, id)
  }



  
  @Post(':id/complete')
  completeAppointment(
    @Param('id') id: string,
    @Body() body: { dto: CompleteNutritionistAppointmentDto; nutritionistId: string },
  ) {
    return this.client.send({ cmd: 'complete_nutritionist_appointment' }, { id, ...body })
  }

   
  @Get('previous/:nutritionistId/:patientId')
  async getPreviousAppointments(
    @Param('nutritionistId') nutritionistId: string,
    @Param('patientId') patientId: string
  ) {
    return this.client.send({ cmd: 'get_previous_appointments' }, { nutritionistId, patientId })
  }




}
