import { 
  Body, 
  Controller, 
  Get, 
  Inject, 
  Post, 
  Req, 
  BadRequestException, 
  UnauthorizedException 
} from '@nestjs/common'
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

  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'verify-otp' }, body))
    } catch (e: any) {
      const msg = e?.message || 'otp verification failed'
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

  @Post('request-password-reset')
  async requestPasswordReset(@Body() body: { email: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'request-password-reset' }, body))
    } catch (e: any) {
      const msg = e?.message || 'request password reset failed'
      throw new BadRequestException(msg)
    }
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; otp: string; newPassword: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'reset-password' }, body))
    } catch (e: any) {
      const msg = e?.message || 'reset password failed'
      throw new BadRequestException(msg)
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
