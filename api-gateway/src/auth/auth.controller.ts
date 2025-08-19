import { Body, Controller, Get, Inject, Post, Req, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Controller('auth')
export class AuthController {
  constructor(@Inject('AUTH_SERVICE') private authClient: ClientProxy) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'register' }, body))
    } catch (e: any) {
      const msg = e?.message || 'register failed'
      throw new BadRequestException(msg)
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'login' }, body))
    } catch (e: any) {
      const msg = e?.message || 'invalid credentials'
      throw new UnauthorizedException(msg)
    }
  }

  @Get('me')
  async me(@Req() req: any) {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) throw new UnauthorizedException('missing token')
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'me' }, token))
    } catch (e: any) {
      const msg = e?.message || 'invalid token'
      throw new UnauthorizedException(msg)
    }
  }
}
