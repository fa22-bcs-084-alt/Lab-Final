import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SupabaseModule } from './supabase/supabase.module'
import { AppointmentsModule } from './appointments/appointments.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), SupabaseModule, AppointmentsModule],
})
export class AppModule {}
