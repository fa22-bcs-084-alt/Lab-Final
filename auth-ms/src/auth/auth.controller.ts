import { Body, Controller, Post, Get, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common'
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

  // === Fitbit OAuth Routes ===
  @Get('fitbit')
  async fitbitAuth(@Req() req, @Res() res: Response) {
    // Get the user's email from query parameter
    const userEmail = req.query.email as string
    
    if (!userEmail) {
      return res.redirect(`${process.env.APP_URL}?error=no_email`)
    }

    // Verify user exists
    const user = await this.auth.getUserByEmail(userEmail)
    if (!user) {
      return res.redirect(`${process.env.APP_URL}?error=user_not_found`)
    }

    // Build Fitbit OAuth URL with state parameter containing the user email
    const callbackUrl = process.env.FITBIT_CALLBACK_URL || 'http://localhost:4001/auth/fitbit/callback'
    const fitbitAuthUrl = `https://www.fitbit.com/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${process.env.FITBIT_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
      `scope=activity%20heartrate%20location%20nutrition%20profile%20settings%20sleep%20social%20weight&` +
      `state=${encodeURIComponent(userEmail)}`

    res.redirect(fitbitAuthUrl)
  }

  @Get('fitbit/callback')
  @UseGuards(AuthGuard('fitbit'))
  async fitbitCallback(@Req() req, @Res() res: Response) {
    const fitbitUser = req.user
    console.log("Fitbit OAuth user=", fitbitUser)

    // Extract the user's email from state parameter
    const userEmail = req.query.state as string

    if (!userEmail) {
      console.error('No email provided in Fitbit OAuth flow')
      return res.redirect(`${process.env.APP_URL}?error=authentication_failed`)
    }

    try {
      // Get user by email
      const user = await this.auth.getUserByEmail(userEmail)
      if (!user) {
        console.error('❌ User not found in database:', userEmail)
        return res.redirect(`${process.env.APP_URL}?error=user_not_found&message=Please signup first`)
      }

      const userId = user.id
      console.log('✅ User found, ID:', userId)

      // Save Fitbit tokens
      await this.auth.handleFitbitCallback(userId, fitbitUser)
      console.log('✅ Fitbit tokens saved successfully for user:', userId)
      res.redirect(`${process.env.APP_URL}?fitbit=connected`)
    } catch (error) {
      console.error('❌ Failed to save Fitbit tokens:', error)
      res.redirect(`${process.env.APP_URL}?error=fitbit_save_failed&message=Database error`)
    }
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

@MessagePattern({ cmd: 'user-data' })
async getUserData(payload: { id: string; role: string }) {
  const { id, role } = payload
  return await this.auth.getUserByRoleAndId(role, id)
}


@MessagePattern({ cmd: 'upload-user-photo' })
async uploadUserPhoto(payload: { role: string; userId: string; fileBuffer: Buffer }) {
  const { role, userId, fileBuffer } = payload
  return await this.auth.upsertUserProfilePhoto(role, userId, fileBuffer)
}


@MessagePattern({ cmd: 'upsert-user-profile' })
async upsertUserProfile(payload: { role: string; profileData: Record<string, any> }) {
  const { role, profileData } = payload
  return await this.auth.upsertUserProfileByRole(role, profileData.profileData)
}




  @MessagePattern({ cmd: 'me' })
  async meMs(token: string) {
    return this.jwt.verify(token)
  }

  // === Test Route: Get Fitbit Data for Any User ===
  @Get('fitbit/test/:userId')
  async testFitbitData(@Req() req, @Res() res: Response) {
    const userId = req.params.userId

    try {
      const data = await this.auth.getFitbitDataForUser(userId)
      return res.json({
        success: true,
        userId,
        data,
        message: 'Real-time Fitbit data fetched successfully'
      })
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      })
    }
  }

  // === Get All Users Fitbit Data ===
  @Get('fitbit/test-all')
  async testAllUsersFitbitData(@Req() req, @Res() res: Response) {
    try {
      const allData = await this.auth.getAllUsersFitbitData()
      return res.json({
        success: true,
        totalUsers: allData.length,
        data: allData,
        message: 'Real-time Fitbit data fetched for all users'
      })
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      })
    }
  }
}
