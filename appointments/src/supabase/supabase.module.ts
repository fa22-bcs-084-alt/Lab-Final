import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { SupabaseController } from './supabase.controller';

@Module({
  controllers: [SupabaseController],
  providers: [SupabaseService],
})
export class SupabaseModule {}
