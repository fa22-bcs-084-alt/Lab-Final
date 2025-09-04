import { Module } from '@nestjs/common'
import { CvController } from './cv.controller'
import { CvService } from './cv.service'
import { MailerService } from 'src/mailer-service/mailer-service.service'

@Module({
  controllers: [CvController],
  providers: [CvService,MailerService],
})
export class CvModule {}
