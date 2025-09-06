// analytics.service.ts
import { Inject, Injectable } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE } from '../supabase/supabase.module'

@Injectable()
export class AnalyticsService {
  constructor(@Inject(SUPABASE) private readonly supabase: SupabaseClient) {}

  async getPatientAnalytics(patientId: string) {
    console.log('[ANALYTICS SERVICE] Fetching patient analytics for:', patientId)

    const today = new Date()
    const past30Days = new Date()
    past30Days.setDate(today.getDate() - 30)

    const { data: fitness, error: fitnessError } = await this.supabase
      .from('fitness')
      .select('*')
      .eq('patient_id', patientId)
      .gte('created_at', past30Days.toISOString())
      .order('created_at', { ascending: true })

    if (fitnessError) {
      console.error('[ANALYTICS SERVICE] Fitness fetch error:', fitnessError.message)
      throw new Error(fitnessError.message)
    }
    console.log('[ANALYTICS SERVICE] Fitness records:', fitness?.length ?? 0)

    const { data: medicalRecords, error: recordsError } = await this.supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })

    if (recordsError) {
      console.error('[ANALYTICS SERVICE] Medical records fetch error:', recordsError.message)
      throw new Error(recordsError.message)
    }
    console.log('[ANALYTICS SERVICE] Medical records:', medicalRecords?.length ?? 0)

    return {
      patientId,
      fitness,
      medicalRecords,
    }
  }

  async getPatientsMonthly(lastNMonths = 6, doctorId: string) {
    console.log('[ANALYTICS SERVICE] Fetching monthly patients for doctor:', doctorId, 'Last months:', lastNMonths)

    const now = new Date()
    const months: { month: string; newPatients: number; totalPatients: number }[] = []

    for (let i = lastNMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)

      console.log(`[ANALYTICS SERVICE] Processing month: ${d.toLocaleString('default', { month: 'short' })}, Range: ${monthStart} - ${monthEnd}`)

      const { data: monthData } = await this.supabase
        .from("appointments")
        .select("patient_id, date")
        .eq("doctor_id", doctorId)
        .gte("date", monthStart)
        .lte("date", monthEnd)

      const newPatients = Array.isArray(monthData) ? new Set(monthData.map((r: any) => r.patient_id)).size : 0
      console.log(`[ANALYTICS SERVICE] Month ${d.toLocaleString('default', { month: 'short' })} new patients:`, newPatients)

      const { data: totalData } = await this.supabase
        .from("appointments")
        .select("patient_id, date")
        .eq("doctor_id", doctorId)
        .lte("date", monthEnd)

      const totalPatients = Array.isArray(totalData) ? new Set(totalData.map((r: any) => r.patient_id)).size : 0
      console.log(`[ANALYTICS SERVICE] Month ${d.toLocaleString('default', { month: 'short' })} total patients:`, totalPatients)

      months.push({
        month: d.toLocaleString("default", { month: "short" }),
        newPatients,
        totalPatients,
      })
    }

    return months
  }

  async getAppointmentsWeekly(doctorId: string) {
    console.log('[ANALYTICS SERVICE] Fetching weekly appointments for doctor:', doctorId)

    const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const { data } = await this.supabase.from("appointments").select("date, status").eq("doctor_id", doctorId)

    const map = new Map<string, { scheduled: number; completed: number; cancelled: number }>()
    week.forEach((d) => map.set(d, { scheduled: 0, completed: 0, cancelled: 0 }))

    if (Array.isArray(data)) {
      console.log('[ANALYTICS SERVICE] Total appointments fetched:', data.length)
      data.forEach((r: any) => {
        const dayName = new Date(r.date).toLocaleDateString("en-US", { weekday: "short" })
        const key = dayName.slice(0, 3)
        if (!map.has(key)) return
        const cur = map.get(key)!
        cur.scheduled += 1
        if (r.status === "completed") cur.completed += 1
        if (r.status === "cancelled") cur.cancelled += 1
        map.set(key, cur)
      })
    }

    const result = Array.from(map.entries()).map(([day, vals]) => ({ day, ...vals }))
    console.log('[ANALYTICS SERVICE] Weekly appointments summary:', result)

    return result
  }
}
