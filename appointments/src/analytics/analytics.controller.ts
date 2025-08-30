// analytics.controller.ts
import { Controller, Get, Param } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import { MessagePattern } from '@nestjs/microservices'

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

   @MessagePattern({ cmd: 'getFitnessData' })
  async getFitnessData(patientId: string) {
    return this.analyticsService.getPatientAnalytics(patientId)
  }
}
