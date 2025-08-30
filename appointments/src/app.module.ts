import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentsModule } from './appointments/appointments.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [AppointmentsModule, SupabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
