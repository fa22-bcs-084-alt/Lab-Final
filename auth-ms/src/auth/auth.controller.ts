import { Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'
import type { Request, Response } from 'express'
import { Res } from '@nestjs/common'
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
    const token = await this.auth.login(req.user)
    res.redirect(`${process.env.APP_URL}/?token=${token.accessToken}`)
  }

  // === Microservice patterns ===
  @MessagePattern({ cmd: 'register' })
  async registerMs(data: { email: string; password: string }) {
    const user = await this.auth.register(data.email, data.password)
    return this.auth.login(user)
  }

  @MessagePattern({ cmd: 'login' })
  async loginMs(data: { email: string; password: string }) {
    const user = await this.auth.validateUser(data.email, data.password)
    return this.auth.login(user)
  }

  @MessagePattern({ cmd: 'me' })
  async meMs(token: string) {
    const decoded = this.jwt.verify(token)
    return decoded
  }
}
