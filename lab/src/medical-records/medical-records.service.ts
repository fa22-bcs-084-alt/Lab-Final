import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'

@Injectable()
export class MedicalRecordsService {
  private readonly supabase: SupabaseClient

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    })
  }

  async uploadFile(patientId: string, file: Express.Multer.File, dto) {
    const upload = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'medical-records' },
        (err, result) => {
          if (err) return reject(err)
          resolve(result as UploadApiResponse)
        }
      )
      Readable.from(file.buffer).pipe(stream)
    })

    const { data, error } = await this.supabase
      .from('medical_records')
      .insert([{
        booked_test_id: dto.bookedTestId,
        patient_id: patientId,
        title: dto.title,
        record_type: dto.recordType,
        file_url: upload.secure_url,
        doctor_name: dto.doctorName,
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteRecord(id: string, patientId: string) {
    const { data, error } = await this.supabase
      .from('medical_records')
      .delete()
      .eq('id', id)
      .eq('patient_id', patientId)
      .select()
      .single()

    if (error) throw error

    if (data?.file_url) {
      const publicId = data.file_url.split('/').pop().split('.')[0]
      await cloudinary.uploader.destroy(`medical-records/${publicId}`)
    }

    return { success: true, deletedId: id }
  }

  async downloadFile(id: string, patientId: string) {
    const { data, error } = await this.supabase
      .from('medical_records')
      .select('*')
      .eq('id', id)
      .eq('patient_id', patientId)
      .single()

    if (error) throw error
    if (!data) throw new Error('Record not found')

    return { fileUrl: data.file_url }
  }

  async listPatientRecords(patientId: string) {
    const { data, error } = await this.supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })

    if (error) throw error
    return data
  }

  async listAllRecords(patientId?: string) {
    let query = this.supabase
      .from('medical_records')
      .select('*')
      .order('date', { ascending: false })

    if (patientId) {
      query = query.eq('patient_id', patientId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }
}
