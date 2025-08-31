import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { SupabaseModule } from '../supabase/supabase.module'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GoogleStrategy } from './google.strategy'
import { MailerService } from 'src/mailer-service/mailer-service.service'
import { MongooseModule } from '@nestjs/mongoose'
import { Profile,ProfileSchema } from 'src/schema/patient.profile.schema'
import { NutritionistProfile, NutritionistProfileSchema } from 'src/schema/nutritionist-profile.schema'


@Module({
  imports: [
    SupabaseModule,
    PassportModule,
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema },{ name: NutritionistProfile.name, schema: NutritionistProfileSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES') || '15m' },
      }),
    }),
  ],
  providers: [AuthService, GoogleStrategy,MailerService],   // <-- add here
  controllers: [AuthController],
})
export class AuthModule {}
