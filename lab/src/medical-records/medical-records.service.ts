import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'

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

async uploadFile(patientId: string, fileBuffer: Buffer | any, fileName: string, mimeType: string, dto) {
  // Reconstruct buffer if it's serialized
  if (fileBuffer && fileBuffer.type === 'Buffer') {
    fileBuffer = Buffer.from(fileBuffer.data)
  }

  const upload = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'medical-records',
        resource_type: 'auto',
        format: mimeType === 'application/pdf' ? 'pdf' : undefined,
      },
      (err, result) => {
        if (err) return reject(err)
        resolve(result as UploadApiResponse)
      },
    )
    Readable.from(fileBuffer).pipe(stream)
  })

  const frontendDomain = "https://hygieia-frontend.vercel.app"
  const viewUrl = upload?.secure_url
    ? `${frontendDomain}/viewReport?fileUrl=${encodeURIComponent(upload.secure_url)}`
    : `${frontendDomain}/viewReport?fileUrl=${encodeURIComponent(upload?.url || "")}`

  const { data, error } = await this.supabase
    .from('medical_records')
    .insert([{
      booked_test_id: dto.bookedTestId,
      patient_id: patientId,
      title: dto.title,
      record_type: dto.recordType,
      file_url: viewUrl,
      doctor_name: dto.doctor_name,
    }])
    .select()
    .single()
  const formData = new FormData()
formData.append('patientId', patientId)
formData.append('title', dto.title)
formData.append('recordType', 'report')
formData.append('doctorName', dto.doctor_name || '')
formData.append('fileUrl', viewUrl)


  if (error) throw error
  return data
}


async deleteRecord(id: string, patientId: string) {
  console.log('[Lab MS] Delete called with id:', id, 'patientId:', patientId)

  const { data, error } = await this.supabase
    .from('medical_records')
    .delete()
    .eq('id', id)
    .select()
    .maybeSingle() // avoids crashing if record doesn't exist

  if (error) {
    console.log('[Lab MS] Supabase error:', error)
    throw error
  }

  if (!data) {
    console.log('[Lab MS] No record found with id:', id)
    throw new Error('Record not found')
  }

  console.log('[Lab MS] Record found, deleting file if exists:', data.file_url)

  if (data?.file_url) {
    // Extract the actual Cloudinary URL from the frontend view URL
    const urlParams = new URLSearchParams(data.file_url.split('?')[1])
    const actualFileUrl = urlParams.get('fileUrl')
    
    if (actualFileUrl) {
      const parts = actualFileUrl.split('/')
      const filename = parts.pop()
      const publicId = filename?.split('.')[0]

      console.log('[Lab MS] Deleting file from Cloudinary, publicId:', publicId)

      if (publicId) {
        const result = await cloudinary.uploader.destroy(`medical-records/${publicId}`, {
          resource_type: 'raw',
        })
        
        console.log('[Lab MS] Cloudinary delete result:', result)
      }
    }
  }

  console.log('[Lab MS] Record deletion successful:', id)
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

    return { file_url: data.file_url }
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
