import { Module } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';
import { MailService } from 'src/mail/mail.service';

@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService,MailService],
})
export class NewsletterModule {}
