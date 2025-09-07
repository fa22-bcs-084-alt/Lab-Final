import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class FitnessService {
  private supabase: SupabaseClient;



  constructor(private configService: ConfigService) {
    
     this.supabase = createClient(
          this.configService.get<string>('SUPABASE_URL')!,
          this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
        );
  }


  logger(msg:string){
   console.log(msg) 
  }
  
  async upsertFitnessRecord(userId: string, updates: any) {
    this.logger('[INFO FITNESS SERVICE] Processing daily fitness record');

    // Define "today"
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Check if a record already exists for today
    const { data: existing, error: fetchError } = await this.supabase
      .from('fitness')
      .select('*')
      .eq('patient_id', userId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .maybeSingle();

    if (fetchError) {
      this.logger(
        `[INFO FITNESS SERVICE] Failed to check today's record: ${fetchError.message}`,
      );
      throw fetchError;
    }

    if (existing) {
      // Update today's record
      this.logger('[INFO FITNESS SERVICE] Updating today\'s record');
      const { data, error } = await this.supabase
        .from('fitness')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        this.logger(
          `[INFO FITNESS SERVICE] Failed to update record: ${error.message}`,
        );
        throw error;
      }

      this.logger('[INFO FITNESS SERVICE] Today\'s record updated successfully');
      return data;
    } else {
      // Insert a new record for today
      this.logger('[INFO FITNESS SERVICE] Adding new record for today');
      const { data, error } = await this.supabase
        .from('fitness')
        .insert([{ patient_id: userId, ...updates }])
        .select()
        .single();

      if (error) {
        this.logger(
          `[INFO FITNESS SERVICE] Failed to add record: ${error.message}`,
        );
        throw error;
      }

      this.logger('[INFO FITNESS SERVICE] New record created successfully');
      return data;
    }
  }

  async getFitnessRecords(userId: string) {
    this.logger('[INFO FITNESS SERVICE] Fetching fitness records');
    const { data, error } = await this.supabase
      .from('fitness')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger(
        `[INFO FITNESS SERVICE] Failed to fetch records: ${error.message}`,
      );
      throw error;
    }

    this.logger('[INFO FITNESS SERVICE] Records fetched successfully');
    return data;
  }
}
