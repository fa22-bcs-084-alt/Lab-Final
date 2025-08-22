import { Module } from '@nestjs/common';
import { LabTestsService } from './lab-tests.service';
import { LabTestsController } from './lab-tests.controller';

@Module({
  controllers: [LabTestsController],
  providers: [LabTestsService],
})
export class LabTestsModule {}
