import { Module } from '@nestjs/common';
import { CvService } from './cv.service';
import { CvController } from './cv.controller';
import { ClientsModule,Transport } from '@nestjs/microservices';

@Module({
    imports: [
      ClientsModule.register([
        {
          name: 'AUTH_SERVICE',
          transport: Transport.TCP,
          options: {
          
            port: 4002,
          },
        },
      ]),
    ],
  controllers: [CvController],
  providers: [CvService],
})
export class CvModule {}
