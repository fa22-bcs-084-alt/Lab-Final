import { Module } from '@nestjs/common';
import { WorkoutSessionService } from './workout-sessions.service';
import { WorkoutSessionsController } from './workout-sessions.controller';

@Module({
  controllers: [WorkoutSessionsController],
  providers: [WorkoutSessionService],
})
export class WorkoutSessionsModule {}
