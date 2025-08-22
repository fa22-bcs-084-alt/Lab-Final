import { Module } from '@nestjs/common';
import { LabTestsService } from './lab-tests.service';
import { LabTestsController } from './lab-tests.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
    imports: [
    ClientsModule.register([
      {
        name: 'LAB_TESTS_SERVICE',
        transport: Transport.TCP,
        options: {
        
          port: 4003,
        },
      },
    ]),
  ],
  controllers: [LabTestsController],
  providers: [LabTestsService],
})
export class LabTestsModule {}
