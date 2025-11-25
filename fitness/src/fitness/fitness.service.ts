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

  async getTodayFitnessData(userId: string) {
    this.logger('[INFO FITNESS SERVICE] Fetching today\'s fitness data');

    // Get current date in Asia/Karachi timezone
    const now = new Date();
    const karachiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    
    // Set to start of day in Karachi timezone
    const todayStart = new Date(karachiTime);
    todayStart.setHours(0, 0, 0, 0);
    
    // Set to end of day in Karachi timezone
    const todayEnd = new Date(karachiTime);
    todayEnd.setHours(23, 59, 59, 999);

    // Convert to UTC for database query
    const todayStartUTC = new Date(todayStart.toISOString());
    const todayEndUTC = new Date(todayEnd.toISOString());

    // Query for today's record
    const { data, error } = await this.supabase
      .from('fitness')
      .select('*')
      .eq('patient_id', userId)
      .gte('created_at', todayStartUTC.toISOString())
      .lte('created_at', todayEndUTC.toISOString())
      .maybeSingle();

    if (error) {
      this.logger(
        `[INFO FITNESS SERVICE] Failed to fetch today's data: ${error.message}`,
      );
      throw error;
    }

    // Return data with default values if no record exists for today
    if (!data) {
      this.logger('[INFO FITNESS SERVICE] No data for today, returning default values');
      return [{
        id: null,
        created_at: null,
        patient_id: userId,
        steps: 0,
        water: 0,
        sleep: 0,
        calories_burned: 0,
        calories_intake: 0,
        fat: 0,
        protein: 0,
        carbs: 0,
      }];
    }

    this.logger('[INFO FITNESS SERVICE] Today\'s data fetched successfully');
    return data;
  }
}
