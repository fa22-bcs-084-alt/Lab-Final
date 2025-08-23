import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'
import { MailerService } from 'src/mailer-service/mailer-service.service'
import { ConfigService } from '@nestjs/config'
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private jwt: JwtService,
     private mailer: MailerService,
     private configService: ConfigService
     
  ) {

     cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    })
  }


  private async sendOtpEmail(email: string, otp: string, subject: string, message: string) {
  await this.mailer.sendMail(email, subject, `${message}\n\nYour OTP: ${otp}`)
}

async verifyResetOtp(email: string, otp: string) {
  const { data, error } = await this.supabase.getClient()
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error || !data) throw new UnauthorizedException('Invalid email')
  if (data.otp !== otp) throw new BadRequestException('Invalid OTP')

  return { success: true, message: 'OTP verified successfully' }
}

  async register(email: string, password: string) {
    const hash = await bcrypt.hash(password, 10)
    const otp = crypto.randomInt(100000, 999999).toString()

    const { data, error } = await this.supabase.getClient()
      .from('users')
      .insert([{ email, password_hash: hash, role: 'patient', otp, is_verified: false }])
      .select()

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('Email already exists')
      }
      throw new Error(error.message)
    }

    await this.sendOtpEmail(email, otp, 'Verify your account', 'Welcome! Please verify your email using the OTP below.')
    return { message: 'Registered successfully, OTP sent to email',success:true }
  }


async registerOAuth(email: string) {
  // check if user already exists
  const { data: existingUser, error: fetchError } = await this.supabase.getClient()
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') { 
    // PGRST116 = no rows found (safe to ignore)
    throw new Error(fetchError.message)
  }

  if (existingUser) {
    return { message: 'User already exists', success: false }
  }

  // insert new user
  const { error: insertError } = await this.supabase.getClient()
    .from('users')
    .insert([{ 
      email, 
      password_hash: '', 
      role: 'patient', 
      otp: 0, 
      is_verified: true 
    }])

  if (insertError) {
    throw new Error(insertError.message)
  }

  return { message: 'Registered successfully', success: true }
}



  
  async verifyOtp(email: string, otp: string) {
    const { data, error } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) throw new UnauthorizedException('Invalid email')
    if (data.otp !== otp) throw new BadRequestException('Invalid OTP')

    await this.supabase.getClient()
      .from('users')
      .update({ is_verified: true, otp: null })
      .eq('email', email)

    return {success: true, message: 'Email verified successfully' }
  }

  async validateUser(email: string, pass: string) {
    const { data, error } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) throw new UnauthorizedException('invalid creds')
    if (!data.is_verified) throw new UnauthorizedException('Email not verified')

    const isMatch = await bcrypt.compare(pass, data.password_hash)
    if (!isMatch) throw new UnauthorizedException('invalid creds')

    return data
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role }
    return {
      accessToken: this.jwt.sign(payload),
      role: user.role,
    id: user.id
    }
  }

  async requestPasswordReset(email: string) {

     const { data: existingUser, error: fetchError } = await this.supabase.getClient()
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

    if(!existingUser){
       return { message: 'No Such user found',success:false }
    }
    const otp = crypto.randomInt(100000, 999999).toString()

    const { error } = await this.supabase.getClient()
      .from('users')
      .update({ otp })
      .eq('email', email)

    if (error) throw new Error(error.message)

    await this.sendOtpEmail(email, otp, 'Password Reset Request', 'Use the OTP below to reset your password.')
    return { message: 'Password reset OTP sent to email',success:true }
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const { data, error } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) throw new UnauthorizedException('Invalid email')
    if (data.otp !== otp) throw new BadRequestException('Invalid OTP')

    const hash = await bcrypt.hash(newPassword, 10)

    await this.supabase.getClient()
      .from('users')
      .update({ password_hash: hash, otp: null })
      .eq('email', email)

    return { message: 'Password reset successfully' ,success:true}
  }

  async findOrCreateGoogleUser(profile: any) {
    const { data: existing, error: findError } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', profile.emails[0].value)
      .maybeSingle()

    if (findError) throw new Error(findError.message)
    if (existing) return existing

    const { data, error } = await this.supabase.getClient()
      .from('users')
      .insert([{
        email: profile.emails[0].value,
        password_hash: '',
        role: 'patient',
        is_verified: true
      }])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }


async getUserByRoleAndId(role: string, id: string) {
  const { data: user, error: userError } = await this.supabase.getClient()
    .from('users')
    .select('id, email, role')
    .eq('id', id)
    .single()

  if (userError || !user) {
    throw new UnauthorizedException('User not found')
  }

  let profile: Record<string, any> = {}

  switch (role) {
    case 'lab-technician': {
      const { data } = await this.supabase.getClient()
        .from('lab_technician_profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (data) profile = data
      break
    }
    case 'doctor': {
      const { data } = await this.supabase.getClient()
        .from('doctor_profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (data) profile = data
      break
    }
    case 'patient': {
      const { data } = await this.supabase.getClient()
        .from('patient_profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (data) profile = data
      break
    }
    case 'nutritionist': {
      const { data } = await this.supabase.getClient()
        .from('nutritionist_profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (data) profile = data
      break
    }
    case 'admin': {
      profile = { admin: true }
      break
    }
    default:
      throw new BadRequestException('Invalid role')
  }

  // force result into a flexible object
  const merged: Record<string, any> = { ...user, ...profile }

  // normalize null/undefined → ''
  Object.keys(merged).forEach((key) => {
    if (merged[key] === null || merged[key] === undefined) {
      merged[key] = ''
    }
  })

  // guarantee `name`
  if (!merged.name || merged.name === '') {
    merged.name = merged.email || 'user'
  }

  return { ...merged, success: true }
}


async upsertUserProfileByRole(role: string, profileData: Record<string, any>) {
  const client = this.supabase.getClient()
  let profile: Record<string, any> = {}

  console.log('Upsert role:', role)
  console.log('Incoming profileData:', profileData)


  switch (role) {
    case 'lab-technician': {
      const { data, error } = await client
        .from('lab_technician_profiles')
        .upsert(this.toDbProfile(profileData), { onConflict: 'id' })
        .select('*')
        .single()
      if (error) {
        console.error('Supabase error (lab-technician):', error)
        throw new BadRequestException(error.message || 'Failed to upsert lab technician profile')
      }
      profile = data
      break
    }
    case 'doctor': {
      const { data, error } = await client
        .from('doctor_profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select('*')
        .single()
      if (error) {
        console.error('Supabase error (doctor):', error)
        throw new BadRequestException(error.message || 'Failed to upsert doctor profile')
      }
      profile = data
      break
    }
    case 'patient': {
      const { data, error } = await client
        .from('patient_profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select('*')
        .single()
      if (error) {
        console.error('Supabase error (patient):', error)
        throw new BadRequestException(error.message || 'Failed to upsert patient profile')
      }
      profile = data
      break
    }
    case 'nutritionist': {
      const { data, error } = await client
        .from('nutritionist_profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select('*')
        .single()
      if (error) {
        console.error('Supabase error (nutritionist):', error)
        throw new BadRequestException(error.message || 'Failed to upsert nutritionist profile')
      }
      profile = data
      break
    }
    default:
      console.error('Invalid role received:', role)
      throw new BadRequestException('Invalid role')
  }

  console.log('Upsert result:', profile)
  return { ...profile, success: true }
}


toDbProfile(profileData: Record<string, any>) {
  const { dateOfBirth, email,role,success,...rest } = profileData
  return {
    ...rest,
    dateofbirth: dateOfBirth,
  }
}




async upsertUserProfilePhoto(role: string, userId: string, fileBuffer: any) {
  const client = this.supabase.getClient();
  let error;

  console.log('Uploading photo for role:', role);

  // 🔑 Rebuild real Buffer if microservice transport converted it
  if (fileBuffer && fileBuffer.type === 'Buffer') {
    fileBuffer = Buffer.from(fileBuffer.data);
  }

  // Upload to Cloudinary
  const uploadResult = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `user_profiles/${role}` },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const readable = new Readable();
    readable.push(fileBuffer);
    readable.push(null);
    readable.pipe(uploadStream);
  }).catch(err => {
    console.error('Cloudinary upload error:', err);
    throw new BadRequestException('Failed to upload image');
  });

  const imgUrl = uploadResult.secure_url;
  console.log('Uploaded image URL:', imgUrl);

  // 🔄 Upsert with placeholders for NOT NULL columns
  switch (role) {
    case 'lab-technician':
      ({ error } = await client
        .from('lab_technician_profiles')
        .upsert(
          { id: userId, img: imgUrl, name: '' }, // 👈 fallback for NOT NULL "name"
          { onConflict: 'id' }
        )
        .select('*')
        .single());
      break;

    case 'doctor':
      ({ error } = await client
        .from('doctor_profiles')
        .upsert(
          { id: userId, img: imgUrl, name: '' }, 
          { onConflict: 'id' }
        )
        .select('*')
        .single());
      break;

    case 'patient':
      ({ error } = await client
        .from('patient_profiles')
        .upsert(
          { id: userId, img: imgUrl, name: '' }, 
          { onConflict: 'id' }
        )
        .select('*')
        .single());
      break;

    case 'nutritionist':
      ({ error } = await client
        .from('nutritionist_profiles')
        .upsert(
          { id: userId, img: imgUrl, name: '' }, 
          { onConflict: 'id' }
        )
        .select('*')
        .single());
      break;

    default:
      console.error('Invalid role:', role);
      throw new BadRequestException('Invalid role');
  }

  if (error) {
    console.error('Supabase upsert error:', error);
    throw new BadRequestException('Failed to update profile image');
  }

  return { img: imgUrl, success: true };
}



}
