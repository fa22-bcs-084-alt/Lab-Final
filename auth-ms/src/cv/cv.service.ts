import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
import { CreateCvDto } from './dto/create-cv.dto'
import { UpdateCvDto } from './dto/update-cv.dto'
import { MailerService } from 'src/mailer-service/mailer-service.service'
import { ClientProxy } from '@nestjs/microservices/client/client-proxy'

@Injectable()
export class CvService {
  private readonly supabase: SupabaseClient

  constructor(private configService: ConfigService,
    private mailer: MailerService,
       @Inject('MAILER_SERVICE') private readonly mailerClient: ClientProxy,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    })
    console.log('[CV MS] CvService initialized')
  }

 async create(dto: CreateCvDto, file?: { buffer: string; mimetype: string }) {
  console.log('[CV MS] create called with dto:', dto)

  // step 1: check if email already exists
  const { data: existing, error: checkError } = await this.supabase
    .from('cv')
    .select('id')
    .eq('email', dto.email)
    .maybeSingle()

  if (checkError) {
    console.error('[CV MS] error checking for existing email:', checkError)
    throw checkError
  }

  if (existing) {
    console.warn('[CV MS] email already exists:', dto.email)
    throw { status: 409, message: 'Email already exists' }
  }

  // step 2: upload file if present
  let cvLink: string | null = null
  if (file) {
    console.log('[CV MS] uploading file to Cloudinary...')
    const buffer = Buffer.from(file.buffer, 'base64')
    cvLink = await this.uploadCvFile(buffer, file.mimetype)
    console.log('[CV MS] file uploaded, cvLink:', cvLink)
  }

  // step 3: insert into supabase
  const insertPayload = { ...dto, cvLink }
  console.log('[CV MS] inserting into Supabase:', insertPayload)

  const { data, error } = await this.supabase
    .from('cv')
    .insert([insertPayload])
    .select()
    .single()

  if (error) {
    console.error('[CV MS] Supabase insert error:', error)
    throw error
  }


  console.log('[CV MS] insert success:', data)

  this.mailerClient.emit('cv-received', { email: dto.email })
  return data
}


  async update(id: string, dto: UpdateCvDto, file?: { buffer: string; mimetype: string }) {
    console.log('[CV MS] update called for id:', id, 'dto:', dto)

    let cvLink: string | null = null

    if (file) {
      console.log('[CV MS] uploading new file to Cloudinary...')
      const buffer = Buffer.from(file.buffer, 'base64')
      cvLink = await this.uploadCvFile(buffer, file.mimetype)
      console.log('[CV MS] new file uploaded, cvLink:', cvLink)
    }

    const updatePayload: any = { ...dto }
    if (cvLink) updatePayload.cvLink = cvLink

    console.log('[CV MS] updating Supabase with payload:', updatePayload)

    const { data, error } = await this.supabase.from('cv').update(updatePayload).eq('id', id).select().single()
    if (error) {
      console.error('[CV MS] Supabase update error:', error)
      throw error
    }
    console.log('[CV MS] update success:', data)
    return data
  }

  private async uploadCvFile(fileBuffer: Buffer, mimeType: string): Promise<string> {
    console.log('[CV MS] uploadCvFile started, mimeType:', mimeType)

    const upload = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'cvs',
          resource_type: 'auto',
          format: mimeType === 'application/pdf' ? 'pdf' : undefined,
        },
        (err, result) => {
          if (err) {
            console.error('[CV MS] Cloudinary upload error:', err)
            return reject(err)
          }
          console.log('[CV MS] Cloudinary upload success:', result?.secure_url)
          resolve(result as UploadApiResponse)
        },
      )
      Readable.from(fileBuffer).pipe(stream)
    })

    return upload.secure_url
  }

  async findAll() {
    console.log('[CV MS] findAll called')
    const { data, error } = await this.supabase.from('cv').select('*')
    if (error) {
      console.error('[CV MS] Supabase findAll error:', error)
      throw error
    }
    console.log('[CV MS] findAll success, count:', data?.length)
    return data
  }

  async findOne(id: string) {
    console.log('[CV MS] findOne called for id:', id)
    const { data, error } = await this.supabase.from('cv').select('*').eq('id', id).single()
    if (error || !data) {
      console.error('[CV MS] CV not found for id:', id)
      throw new NotFoundException('CV not found')
    }
    console.log('[CV MS] findOne success:', data)
    return data
  }

  async remove(id: string) {
    console.log('[CV MS] remove called for id:', id)
    const { data, error } = await this.supabase.from('cv').delete().eq('id', id).select().maybeSingle()
    if (error) {
      console.error('[CV MS] Supabase remove error:', error)
      throw error
    }
    if (!data) {
      console.error('[CV MS] CV not found for deletion, id:', id)
      throw new NotFoundException('CV not found')
    }
    console.log('[CV MS] remove success for id:', id)
    return { message: 'CV deleted successfully' }
  }




  private async sendEmail(email: string) {
  try {
    console.log(`[CV MS] Sending email to ${email}`)

    const subject = 'CV Received - Thank You for Applying'
    const textMessage = `Hello,

We have received your CV. Our recruitment team will review your application. If your profile matches an available position, we will contact you.

Thank you for your interest.

Best regards,  
HR Team`

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
        <h2 style="color:#0a6cff;">CV Received</h2>
        <p>Dear Candidate,</p>
        <p>We have received your CV. Our recruitment team will carefully review your application. 
        If your profile matches an available position, we will reach out to you.</p>
        <p>Thank you for your interest in joining our team.</p>
        <br>
        <p style="font-size: 14px; color: #555;">Best regards,<br>HR Team</p>
      </div>
    `

    await this.mailer.sendMail(
      email,
      subject,
       textMessage,
      htmlMessage,
    )

    console.log(`[CV MS] Email successfully sent to ${email}`)
  } catch (err) {
    console.error(`[CV MS] Failed to send email to ${email}:`, err)
    throw err
  }
}

}
