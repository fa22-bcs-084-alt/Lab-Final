import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentsModule } from './appointments/appointments.module';
import { ConfigModule } from '@nestjs/config'
import { MailModule } from './mail/mail.module';

@Module({
  imports: [  ConfigModule.forRoot({ isGlobal: true }),
    AppointmentsModule,
    MailModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
