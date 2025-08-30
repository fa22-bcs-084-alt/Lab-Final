import { Module } from '@nestjs/common';
import { DietPlanService } from './diet-plan.service';
import { DietPlanController } from './diet-plan.controller';
import { ClientsModule,Transport } from '@nestjs/microservices';

@Module({
  imports: [
        ClientsModule.register([
          {
            name: 'APPOINTMENTS_SERVICE',
            transport: Transport.TCP,
            options: {
            
              port: 4006,
            },
          },
        ]),
      ],
  controllers: [DietPlanController],
  providers: [DietPlanService],
})
export class DietPlanModule {}
