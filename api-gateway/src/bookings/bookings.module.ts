import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
    imports: [
      ClientsModule.register([
        {
          name: 'LABS',
          transport: Transport.TCP,
          options: {
          
            port: 4003,
          },
        },
      ]),
    ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
