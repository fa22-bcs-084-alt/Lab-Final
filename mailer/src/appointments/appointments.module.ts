import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { MailService } from 'src/mail/mail.service';


@Module({

  controllers: [AppointmentsController],
  providers: [AppointmentsService,MailService],
})
export class AppointmentsModule {}
