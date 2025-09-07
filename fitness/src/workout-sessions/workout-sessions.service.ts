import { Injectable } from '@nestjs/common';
import { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';
import { UpdateWorkoutSessionDto } from './dto/update-workout-session.dto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkoutSessionService {
  private client: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.client = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  async create(dto: CreateWorkoutSessionDto) {
    console.log('[Workout MS] Creating workout session', dto);
    const { data, error } = await this.client
      .from('workout_sessions')
      .insert([{
        patient_id: dto.patientId,
        routine_id: dto.routineId,
        exercises: dto.exercises,
        total_duration: dto.totalDuration,
        total_calories: dto.totalCalories,
      }])
      .select()
      .single();

    if (error) {
      console.error('[Workout MS] Error creating workout session:', error.message);
      throw new Error(error.message);
    }
    console.log('[Workout MS] Created workout session', data);
    return data;
  }

  async findAllByPatient(patientId: string) {
    console.log('[Workout MS] Finding all workout sessions for patient', patientId);
    const { data, error } = await this.client
      .from('workout_sessions')
      .select('*')
      .eq('patient_id', patientId);

    if (error) {
      console.error('[Workout MS] Error finding workout sessions:', error.message);
      throw new Error(error.message);
    }
    console.log('[Workout MS] Found sessions:', data?.length);
    return data;
  }

  async findOne(id: string) {
    console.log('[Workout MS] Finding workout session by id', id);
    const { data, error } = await this.client
      .from('workout_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Workout MS] Error finding workout session:', error.message);
      throw new Error(error.message);
    }
    console.log('[Workout MS] Found workout session', data);
    return data;
  }

  async update(id: string, dto: UpdateWorkoutSessionDto) {
    console.log('[Workout MS] Updating workout session', id, dto);
    const { data, error } = await this.client
      .from('workout_sessions')
      .update({
        routine_id: dto.routineId,
        exercises: dto.exercises,
        total_duration: dto.totalDuration,
        total_calories: dto.totalCalories,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Workout MS] Error updating workout session:', error.message);
      throw new Error(error.message);
    }
    console.log('[Workout MS] Updated workout session', data);
    return data;
  }

  async remove(id: string) {
    console.log('[Workout MS] Removing workout session', id);
    const { data, error } = await this.client
      .from('workout_sessions')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Workout MS] Error removing workout session:', error.message);
      throw new Error(error.message);
    }
    console.log('[Workout MS] Removed workout session', data);
    return data;
  }
}
