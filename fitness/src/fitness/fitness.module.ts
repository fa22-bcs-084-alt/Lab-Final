import { Module } from '@nestjs/common';
import { FitnessService } from './fitness.service';
import { FitnessController } from './fitness.controller';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports:[ConfigModule],
  controllers: [FitnessController],
  providers: [FitnessService],
})
export class FitnessModule {}
