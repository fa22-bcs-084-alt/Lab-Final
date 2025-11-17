import { Module } from '@nestjs/common';
import { LabsReminderService } from './labs-reminder.service';
import { LabsReminderController } from './labs-reminder.controller';
import { ClientsModule } from '@nestjs/microservices/module/clients.module';
import { Transport } from '@nestjs/microservices/enums/transport.enum';

@Module({
    imports: [
       ClientsModule.register([
              {
               name: 'MAILER_SERVICE',
               transport: Transport.RMQ,
               options: {
                 urls: ['amqp://guest:guest@localhost:5672'],
                 queue: 'email_queue',
                 queueOptions: { durable: true },
               },
             },
             ]),
            ],
  controllers: [LabsReminderController],
  providers: [LabsReminderService],
})
export class LabsReminderModule {}
