import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { SupabaseModule } from '../supabase/supabase.module'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GoogleStrategy } from './google.strategy'

@Module({
  imports: [
    SupabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES') || '15m' },
      }),
    }),
  ],
  providers: [AuthService, GoogleStrategy],   // <-- add here
  controllers: [AuthController],
})
export class AuthModule {}
