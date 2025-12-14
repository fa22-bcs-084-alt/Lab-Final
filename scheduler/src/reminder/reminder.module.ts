import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';
import { Transport } from '@nestjs/microservices/enums/transport.enum';
import { ClientsModule } from '@nestjs/microservices/module/clients.module';

@Module({
  imports: [
     ClientsModule.register([
            {
             name: 'MAILER_SERVICE',
             transport: Transport.RMQ,
             options: {
               urls: [`amqp://guest:guest@${process.env.RABBITMQ_HOST || 'localhost'}:5672`],
               queue: 'email_queue',
               queueOptions: { durable: true },
             },
           },
           ]),
          ],
  controllers: [ReminderController],
  providers: [ReminderService],
})
export class ReminderModule {}
