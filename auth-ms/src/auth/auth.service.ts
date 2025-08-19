import { Injectable, UnauthorizedException,ConflictException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  constructor(
    private supabase: SupabaseService,
    private jwt: JwtService
  ) {}

  async register(email: string, password: string) {
    const hash = await bcrypt.hash(password, 10)

    const { data, error } = await this.supabase.getClient()
      .from('users')
      .insert([{ email, password_hash: hash, role: 'patient' }])
      .select()

    if (error) {
      if (error.code === '23505') { // Postgres unique violation
        throw new ConflictException('Email already exists')
      }
      throw new Error(error.message)
    }

    return data[0]
  }

  async validateUser(email: string, pass: string) {
    const { data, error } = await this.supabase.getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) throw new UnauthorizedException('invalid creds')

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
      password_hash: '', // since Google auth doesn’t need it
      role: 'patient'
    }])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

}
