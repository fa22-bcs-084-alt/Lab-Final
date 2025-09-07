import { Module } from '@nestjs/common';
import { WorkoutSessionsService } from './workout-sessions.service';
import { WorkoutSessionsController } from './workout-sessions.controller';
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
  controllers: [WorkoutSessionsController],
  providers: [WorkoutSessionsService],
})
export class WorkoutSessionsModule {}
