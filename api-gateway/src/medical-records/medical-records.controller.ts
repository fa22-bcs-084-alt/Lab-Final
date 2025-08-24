import { Controller, Post, UseInterceptors, UploadedFile, Body, Req, Delete, Param, Get, Query, Inject, BadRequestException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Controller('medical-records')
export class MedicalRecordsController {
  constructor(
    @Inject('MEDICAL_RECORDS_SERVICE') private readonly medicalRecordsClient: ClientProxy,
  ) {}


@Post('upload')
@UseInterceptors(FileInterceptor('file')) // <-- must be 'file'
async upload(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: any,
  @Req() req
) {
  console.log('file:', file)   // 👀 Debug
  console.log('dto:', dto)     // 👀 Debug

  const patientId = req.user?.id || dto.patientId

  if (!file) throw new BadRequestException('File is required')

  const payload = {
    patientId,
    fileBuffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    dto,
  }

  return firstValueFrom(
    this.medicalRecordsClient.send({ cmd: 'uploadMedicalRecord' }, payload)
  )
}


@Delete(':id')
async delete(@Param('id') id: string, @Req() req, @Query('patientId') patientIdQuery?: string) {
  const patientId = req.user?.id || patientIdQuery
  if (!patientId) throw new Error('Patient ID is required to delete record')
  
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
    console.log("medcial recordds")
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
