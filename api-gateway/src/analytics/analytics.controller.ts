import { Controller, Get, Inject, Param, Query } from '@nestjs/common';

import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject('APPOINTMENTS_SERVICE') private readonly client: ClientProxy) {}

  @Get("patients-monthly")
  getPatientsMonthly(@Query("doctorId") doctorId: string) {
    return this.client.send({ cmd: "patients-monthly" }, { doctorId, months: 6 })
  }

  @Get("appointments-weekly")
  getAppointmentsWeekly(@Query("doctorId") doctorId: string) {
    return this.client.send({ cmd: "appointments-weekly" }, { doctorId })
  }

  @Get(":patientId")
  async getPatientAnalytics(@Param("patientId") patientId: string) {
    return firstValueFrom(this.client.send({ cmd: "getFitnessData" }, patientId))
  }
}

