import { Module } from '@nestjs/common';

import { ClientsModule, Transport } from '@nestjs/microservices';

import { AnalyticsController } from './analytics.controller';

@Module({
   imports: [
        ClientsModule.register([
          {
            name: 'APPOINTMENTS_SERVICE',
            transport: Transport.TCP,
            options: {
            
              port: 4006,
            },
          },
        ]),
      ],
  controllers: [AnalyticsController],

})
export class AnalyticsModule {}
