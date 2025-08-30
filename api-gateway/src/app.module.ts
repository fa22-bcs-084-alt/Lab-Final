import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { LabTestsModule } from './lab-tests/lab-tests.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { FitnessModule } from './fitness/fitness.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DietPlanModule } from './diet-plan/diet-plan.module';

@Module({
  imports: [AuthModule, BookingsModule, LabTestsModule, MedicalRecordsModule, FitnessModule, AppointmentsModule, AnalyticsModule, DietPlanModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
