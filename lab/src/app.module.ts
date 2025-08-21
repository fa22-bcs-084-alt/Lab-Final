import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingsModule } from './bookings/bookings.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { ConfigModule } from '@nestjs/config';
import { LabTestsModule } from './lab-tests/lab-tests.module';
@Module({
  imports: [BookingsModule, MedicalRecordsModule,LabTestsModule,
      ConfigModule.forRoot({
      isGlobal: true, // makes env available everywhere
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
