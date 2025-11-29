import { PassportStrategy } from '@nestjs/passport'
import { FitbitOAuth2Strategy } from 'passport-fitbit-oauth2'
import { Injectable } from '@nestjs/common'

@Injectable()
export class FitbitStrategy extends PassportStrategy(FitbitOAuth2Strategy, 'fitbit') {
  constructor() {
    super({
      clientID: process.env.FITBIT_CLIENT_ID,
      clientSecret: process.env.FITBIT_CLIENT_SECRET,
      callbackURL: process.env.FITBIT_CALLBACK_URL,
      scope: ['activity', 'heartrate', 'location', 'nutrition', 'profile', 'settings', 'sleep', 'social', 'weight'],
    })
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any): Promise<any> {
    const user = {
      fitbitId: profile.id,
      accessToken,
      refreshToken,
      profile,
    }
    done(null, user)
  }
}
