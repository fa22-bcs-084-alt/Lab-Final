import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingsModule } from './bookings/bookings.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LabTestsModule } from './lab-tests/lab-tests.module';
import { MongooseModule } from '@nestjs/mongoose';
@Module({
  imports: [BookingsModule, MedicalRecordsModule,LabTestsModule,
      ConfigModule.forRoot({
      isGlobal: true, // makes env available everywhere
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
