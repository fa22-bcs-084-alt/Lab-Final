import { Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'
import type { Request ,Response} from 'express'
import {  Res } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Controller()
export class AuthController {
  constructor(private auth: AuthService, private jwt: JwtService) {}

  @Post('register')
  async register(@Body() body: { email: string, password: string }) {
    const user = await this.auth.register(body.email, body.password)
    return this.auth.login(user)
  }

  @Post('login')
  async login(@Body() body: { email: string, password: string }) {
    const user = await this.auth.validateUser(body.email, body.password)
    return this.auth.login(user)
  }

  @Get('me')
  async me(@Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1]
    const decoded = this.jwt.verify(token!)
    return decoded
  }


@Get('google')
@UseGuards(AuthGuard('google'))
async googleAuth() {}

@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleCallback(@Req() req, @Res() res: Response) {
  const token = await this.auth.login(req.user)
  res.redirect(`${process.env.APP_URL}/?token=${token.accessToken}`)
}


}
