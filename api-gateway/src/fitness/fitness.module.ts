import { Module } from '@nestjs/common';
import { FitnessService } from './fitness.service';
import { FitnessController } from './fitness.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
      ClientsModule.register([
        {
          name: 'FITNESS_SERVICE',
          transport: Transport.TCP,
          options: {
          
            port: 4005,
          },
        },
      ]),
    ],
  controllers: [FitnessController],
  providers: [FitnessService],
})
export class FitnessModule {}
