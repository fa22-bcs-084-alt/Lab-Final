import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'
import { MailerService } from 'src/mailer-service/mailer-service.service'

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private jwt: JwtService,
     private mailer: MailerService
  ) {}


  private async sendOtpEmail(email: string, otp: string, subject: string, message: string) {
  await this.mailer.sendMail(email, subject, `${message}\n\nYour OTP: ${otp}`)
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
    return { message: 'Registered successfully, OTP sent to email' }
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

    return { message: 'Email verified successfully' }
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
    }
  }

  async requestPasswordReset(email: string) {
    const otp = crypto.randomInt(100000, 999999).toString()

    const { error } = await this.supabase.getClient()
      .from('users')
      .update({ otp })
      .eq('email', email)

    if (error) throw new Error(error.message)

    await this.sendOtpEmail(email, otp, 'Password Reset Request', 'Use the OTP below to reset your password.')
    return { message: 'Password reset OTP sent to email' }
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

    return { message: 'Password reset successfully' }
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
}
