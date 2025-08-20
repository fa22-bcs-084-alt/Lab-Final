import { Body, Controller, Post, Get, Req, Res, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'
import type {  Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { MessagePattern } from '@nestjs/microservices'

@Controller()
export class AuthController {
  constructor(private auth: AuthService, private jwt: JwtService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}
  
  

@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleCallback(@Req() req, @Res() res: Response) {
  const user = req.user
  console.log("o auth user=", user)

  const email = user.emails?.[0]?.value // 👈 extract email safely
  if (!email) {
    throw new Error('Google account has no email')
  }

  await this.auth.registerOAuth(email)

  const token = await this.auth.login(req.user)
  res.redirect(`${process.env.APP_URL}/?token=${token.accessToken}`)
}

  // === Microservice patterns ===
  @MessagePattern({ cmd: 'register' })
  async registerMs(data: { email: string; password: string }) {
    return this.auth.register(data.email, data.password)
  }

  @MessagePattern({ cmd: 'verify-otp' })
  async verifyOtpMs(data: { email: string; otp: string }) {
    return this.auth.verifyOtp(data.email, data.otp)
  }

  @MessagePattern({ cmd: 'login' })
  async loginMs(data: { email: string; password: string }) {
    const user = await this.auth.validateUser(data.email, data.password)
    return this.auth.login(user)
  }

  @MessagePattern({ cmd: 'request-password-reset' })
  async requestPasswordResetMs(data: { email: string }) {
    return this.auth.requestPasswordReset(data.email)
  }

  @MessagePattern({ cmd: 'verify-reset-otp' })
  async VerifyResetOtp(data: { email: string, otp: string}) {
    return this.auth.verifyResetOtp(data.email,data.otp)
  }

  @MessagePattern({ cmd: 'reset-password' })
  async resetPasswordMs(data: { email: string; otp: string; newPassword: string }) {
    return this.auth.resetPassword(data.email, data.otp, data.newPassword)
  }

  @MessagePattern({ cmd: 'me' })
  async meMs(token: string) {
    return this.jwt.verify(token)
  }
}
