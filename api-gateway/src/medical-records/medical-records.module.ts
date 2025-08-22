import { Module } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordsController } from './medical-records.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
    imports: [
    ClientsModule.register([
      {
        name: 'MEDICAL_RECORDS_SERVICE',
        transport: Transport.TCP,
        options: {
        
          port: 4003,
        },
      },
    ]),
  ],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
