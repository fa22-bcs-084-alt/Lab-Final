import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { MedicalRecordsService } from './medical-records.service'

@Controller()
export class MedicalRecordsController {
  constructor(private readonly svc: MedicalRecordsService) {}

@MessagePattern({ cmd: 'uploadMedicalRecord' })
async upload(@Payload() data: { patientId: string; fileBuffer: Buffer; originalName: string; mimeType: string; dto: any }) {
  return this.svc.uploadFile(data.patientId, data.fileBuffer, data.originalName, data.mimeType, data.dto)
}



  @MessagePattern({ cmd: 'deleteMedicalRecord' })
  async delete(@Payload() data: { id: string; patientId: string }) {
    return this.svc.deleteRecord(data.id, data.patientId)
  }

  @MessagePattern({ cmd: 'downloadMedicalRecord' })
  async download(@Payload() data: { id: string; patientId: string }) {
    return this.svc.downloadFile(data.id, data.patientId)
  }

  @MessagePattern({ cmd: 'listPatientMedicalRecords' })
  async listPatient(@Payload() patientId: string) {
    return this.svc.listPatientRecords(patientId)
  }

  @MessagePattern({ cmd: 'listAllMedicalRecords' })
  async listAll(@Payload() patientId?: string) {
    return this.svc.listAllRecords(patientId)
  }
}
