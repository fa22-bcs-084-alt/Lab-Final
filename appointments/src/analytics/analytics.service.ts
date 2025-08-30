// analytics.service.ts
import { Inject, Injectable } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE } from '../supabase/supabase.module'
@Injectable()
export class AnalyticsService {
    constructor(@Inject(SUPABASE) private readonly supabase: SupabaseClient){}


    
  async getPatientAnalytics(patientId: string) {
    const today = new Date()
    const past30Days = new Date()
    past30Days.setDate(today.getDate() - 30)

    // fetch fitness data
    const { data: fitness, error: fitnessError } = await this.supabase
      .from('fitness')
      .select('*')
      .eq('patient_id', patientId)
      .gte('created_at', past30Days.toISOString())
      .order('created_at', { ascending: true })

    if (fitnessError) throw new Error(fitnessError.message)

    // fetch medical records
    const { data: medicalRecords, error: recordsError } = await this.supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })

    if (recordsError) throw new Error(recordsError.message)

    return {
      patientId,
      fitness,
      medicalRecords,
    }
  }
}
