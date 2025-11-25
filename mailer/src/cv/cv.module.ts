import { Module } from '@nestjs/common';
import { CvService } from './cv.service';
import { CvController } from './cv.controller';
import { MailService } from 'src/mail/mail.service';

@Module({
  controllers: [CvController],
  providers: [CvService,MailService],
})
export class CvModule {}
