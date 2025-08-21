import { Controller, Post, UseInterceptors, UploadedFile, Body, Req, Delete, Param, Get, Query } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { MedicalRecordsService } from './medical-records.service'

@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly svc: MedicalRecordsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Body() dto: any, @Req() req) {
    const patientId = req.user?.id || dto.patientId
    return this.svc.uploadFile(patientId, file, dto)
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    const patientId = req.user?.id || req.body.patientId
    return this.svc.deleteRecord(id, patientId)
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Req() req) {
    const patientId = req.user?.id || req.query.patientId
    return this.svc.downloadFile(id, patientId)
  }

  @Get('patient/:patientId')
  async listPatient(@Param('patientId') patientId: string) {
    return this.svc.listPatientRecords(patientId)
  }

  @Get('all')
  async listAll(@Query('patientId') patientId?: string) {
    return this.svc.listAllRecords(patientId)
  }
}
