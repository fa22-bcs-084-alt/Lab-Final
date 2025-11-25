import { Module } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

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
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}

