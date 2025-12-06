import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MailService } from 'src/mail/mail.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService,MailService],
})
export class AuthModule {}
