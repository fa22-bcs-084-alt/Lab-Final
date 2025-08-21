import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingsModule } from './bookings/bookings.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';

@Module({
  imports: [BookingsModule, MedicalRecordsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
