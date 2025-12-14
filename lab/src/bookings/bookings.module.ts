import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Profile, ProfileSchema } from './schema/patient.profile.schema';
import { ClientsModule } from '@nestjs/microservices/module/clients.module';
import { Transport } from '@nestjs/microservices/enums/transport.enum';

@Module({
  imports:[ 
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
        {
              name: 'SCHEDULER_SERVICE',
              transport: Transport.RMQ,
              options: {
                urls: [`amqp://guest:guest@${process.env.RABBITMQ_HOST || 'localhost'}:5672`],
                queue: 'appointments_queue',
                queueOptions: { durable: true },
              },
            }, 
      ]),
     MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),
],

  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
