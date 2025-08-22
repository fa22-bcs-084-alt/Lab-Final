import { Controller, Post, UseInterceptors, UploadedFile, Body, Req, Delete, Param, Get, Query, Inject } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Controller('medical-records')
export class MedicalRecordsController {
  constructor(
    @Inject('MEDICAL_RECORDS_SERVICE') private readonly medicalRecordsClient: ClientProxy,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Body() dto: any, @Req() req) {
    const patientId = req.user?.id || dto.patientId
    return firstValueFrom(
      this.medicalRecordsClient.send({ cmd: 'uploadMedicalRecord' }, { patientId, file, dto }),
    )
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    const patientId = req.user?.id || req.body.patientId
    return firstValueFrom(
      this.medicalRecordsClient.send({ cmd: 'deleteMedicalRecord' }, { id, patientId }),
    )
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Req() req) {
    const patientId = req.user?.id || req.query.patientId
    return firstValueFrom(
      this.medicalRecordsClient.send({ cmd: 'downloadMedicalRecord' }, { id, patientId }),
    )
  }

  @Get('patient/:patientId')
  async listPatient(@Param('patientId') patientId: string) {
    return firstValueFrom(
      this.medicalRecordsClient.send({ cmd: 'listPatientMedicalRecords' }, patientId),
    )
  }

  @Get('all')
  async listAll(@Query('patientId') patientId?: string) {
    return firstValueFrom(
      this.medicalRecordsClient.send({ cmd: 'listAllMedicalRecords' }, patientId),
    )
  }
}
