import { Module } from '@nestjs/common';
import { LabsService } from './labs.service';
import { LabsController } from './labs.controller';
import { MailService } from 'src/mail/mail.service';

@Module({
  controllers: [LabsController],
  providers: [LabsService,MailService],
})
export class LabsModule {}
