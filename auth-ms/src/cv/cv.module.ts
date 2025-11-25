import { Module } from '@nestjs/common'
import { CvController } from './cv.controller'
import { CvService } from './cv.service'
import { MailerService } from 'src/mailer-service/mailer-service.service'
import { ClientsModule } from '@nestjs/microservices/module/clients.module'
import { Transport } from '@nestjs/microservices/enums/transport.enum'

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
  controllers: [CvController],
  providers: [CvService,MailerService],
})
export class CvModule {}
