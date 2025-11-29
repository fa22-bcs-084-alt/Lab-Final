import { Module } from '@nestjs/common'
import { FitbitService } from './fitbit.service'
import { FitbitScheduler } from './fitbit.scheduler'
import { SupabaseModule } from '../supabase/supabase.module'
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [SupabaseModule, ConfigModule],
  providers: [FitbitService, FitbitScheduler],
  exports: [FitbitService],
})
export class FitbitModule {}
