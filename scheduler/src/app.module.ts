import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { ReminderModule } from './reminder/reminder.module';
import { BullModule } from '@nestjs/bullmq'
import { LabsReminderModule } from './labs-reminder/labs-reminder.module';


@Module({
  imports: [SchedulerModule,
     ConfigModule.forRoot({
      isGlobal: true,
    }),
     ReminderModule,
      BullModule.forRoot({
      connection: {
        host: 'localhost', 
        port: 6379,
      },
    }),
      LabsReminderModule,
  
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
