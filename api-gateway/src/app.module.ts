import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { LabTestsModule } from './lab-tests/lab-tests.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';

@Module({
  imports: [AuthModule, BookingsModule, LabTestsModule, MedicalRecordsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
