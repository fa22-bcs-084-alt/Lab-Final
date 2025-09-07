import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FitnessModule } from './fitness/fitness.module';
import { ConfigModule } from '@nestjs/config';
import { WorkoutSessionsModule } from './workout-sessions/workout-sessions.module';

@Module({
  imports: [FitnessModule, ConfigModule.forRoot({ isGlobal: true }), WorkoutSessionsModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
