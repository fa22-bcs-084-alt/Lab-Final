import { Controller, Get, Inject, Param } from '@nestjs/common';

import { firstValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

@Controller('analytics')
export class AnalyticsController {
  constructor( @Inject('APPOINTMENTS_SERVICE') private readonly client: ClientProxy) {}

   @Get(':patientId')
  async getPatientAnalytics(@Param('patientId') patientId: string) {
    const fitnessPromise = firstValueFrom(
      this.client.send({ cmd: 'getFitnessData' }, patientId)
    )
  return await fitnessPromise
  }
    
}
