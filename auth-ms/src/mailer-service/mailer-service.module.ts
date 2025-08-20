import { Module } from '@nestjs/common';
import { MailerService } from './mailer-service.service';

@Module({
  exports:[MailerService],
  providers: [MailerService],
})
export class MailerServiceModule {}
