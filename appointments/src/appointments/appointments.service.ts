import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE } from '../supabase/supabase.module'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { AppointmentMode, AppointmentStatus, AppointmentTypes } from './appointment.enums'
import { InjectModel } from '@nestjs/mongoose'
import { Profile, ProfileDocument } from './schema/patient.profile.schema'
import { Model } from 'mongoose'
import { CompleteNutritionistAppointmentDto } from './dto/complete-nutritionist-appointment.dto'

type DbRow = {
  id: string
  patient_id: string
  doctor_id: string
  date: string
  time: string
  status: string
  type: string
  notes: string | null
  report: string | null
  mode: string
  data_shared: boolean
  created_at: string
  updated_at: string
}

type ApiRow = {
  id: string
  patientId: string
  doctorId: string
  date: string
  time: string
  status: AppointmentStatus
  type: AppointmentTypes
  notes?: string | null
  report?: string | null
  mode: AppointmentMode
  dataShared: boolean
  createdAt: string
  updatedAt: string
}

@Injectable()
export class AppointmentsService {
  constructor(@Inject(SUPABASE) private readonly supabase: SupabaseClient,
 @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>
) {}

  private toApi(r: DbRow): ApiRow {
    return {
      id: r.id,
      patientId: r.patient_id,
      doctorId: r.doctor_id,
      date: r.date,
      time: r.time,
      status: r.status as AppointmentStatus,
      type: r.type as AppointmentTypes,
      notes: r.notes,
      report: r.report,
      mode: r.mode as AppointmentMode,
      dataShared: r.data_shared,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
  }

  private toDb(dto: Partial<CreateAppointmentDto>): Partial<DbRow> {
    return {
      patient_id: dto.patientId as string,
      doctor_id: dto.doctorId as string,
      date: dto.date as string,
      time: dto.time as string,
      status: dto.status as string,
      type: dto.type as string,
      notes: dto.notes ?? null,
      report: dto.report ?? null,
      mode: dto.mode as string,
      data_shared: dto.dataShared as boolean,
    } as Partial<DbRow>
  }

  async create(dto: CreateAppointmentDto): Promise<ApiRow> {
    const payload = this.toDb(dto)
    const { data, error } = await this.supabase.from('appointments').insert(payload).select().single()
    if (error) throw new BadRequestException(error.message)
    return this.toApi(data as DbRow)
  }

async findAll(query: {
  patientId?: string
  doctorId?: string
  status?: AppointmentStatus
  type?: AppointmentTypes
  mode?: AppointmentMode
  from?: string
  to?: string
  limit?: number
  offset?: number
}): Promise<{ items: []; count: number }> {
  let q = this.supabase.from('appointments').select('*', { count: 'exact' })

  if (query.patientId) q = q.eq('patient_id', query.patientId)
  if (query.doctorId) q = q.eq('doctor_id', query.doctorId)
  if (query.status) q = q.eq('status', query.status)
  if (query.type) q = q.eq('type', query.type)
  if (query.mode) q = q.eq('mode', query.mode)
  if (query.from) q = q.gte('date', query.from)
  if (query.to) q = q.lte('date', query.to)

  const limit = query.limit ?? 20
  const offset = query.offset ?? 0
  q = q.order('date', { ascending: true }).order('time', { ascending: true }).range(offset, offset + limit - 1)

  const { data, error, count } = await q
  if (error) throw new BadRequestException(error.message)
  if (!data) return { items: [], count: 0 }

  const items:any = []
  for (const row of data as DbRow[]) {
    const patient = await this.profileModel.findOne({ id: row.patient_id }).lean()
    if (!patient) continue

    items.push({
      id: row.id,
      patient: patient as any, // ProfileType
      doctor: { id: row.doctor_id } as any, // plug doctor lookup here if you want full profile
      date: row.date,
      time: row.time,
      status: row.status as AppointmentStatus,
      type: row.type as AppointmentTypes,
      notes: row.notes ?? undefined,
      report: row.report ?? undefined,
      mode: row.mode as AppointmentMode,
      dataShared: row.data_shared,
    })
  }

  return { items, count: count ?? 0 }
}


  async findOne(id: string): Promise<ApiRow> {
    const { data, error } = await this.supabase.from('appointments').select('*').eq('id', id).single()
    if (error?.message?.includes('No rows')) throw new NotFoundException('appointment not found')
    if (error) throw new BadRequestException(error.message)
    return this.toApi(data as DbRow)
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<ApiRow> {
    const payload = this.toDb(dto)
    const { data, error } = await this.supabase.from('appointments').update(payload).eq('id', id).select().single()
    if (error?.message?.includes('No rows')) throw new NotFoundException('appointment not found')
    if (error) throw new BadRequestException(error.message)
    return this.toApi(data as DbRow)
  }

  async remove(id: string): Promise<{ id: string; deleted: boolean }> {
    const { error } = await this.supabase.from('appointments').delete().eq('id', id)
    if (error) throw new BadRequestException(error.message)
    return { id, deleted: true }
  }



  async completeNutritionistAppointment(
  id: string,
  dto: CompleteNutritionistAppointmentDto,
  nutritionistId: string
): Promise<ApiRow> {
  // fetch appointment
  const { data: appointment, error } = await this.supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single()

  if (error?.message?.includes('No rows')) throw new NotFoundException('appointment not found')
  if (error) throw new BadRequestException(error.message)

  const appt = appointment as DbRow

if (dto.referredTestIds && dto.referredTestIds.length > 0) {
  const inserts = dto.referredTestIds.map(testId => ({
    test_id: testId,
    patient_id: appt.patient_id,
    referrer_id: nutritionistId,
  }))

  const { error: testErr } = await this.supabase.from('referred_tests').insert(inserts)
  if (testErr) throw new BadRequestException(testErr.message)
}

  // create diet plan if provided
  if (dto.dietPlan) {
    const { error: dietErr } = await this.supabase.from('diet_plan').insert({
      patient_id: appt.patient_id,
      nutritionist_id: nutritionistId,
      daily_calories: dto.dietPlan.dailyCalories,
      protein: dto.dietPlan.protein,
      carbs: dto.dietPlan.carbs,
      fat: dto.dietPlan.fat,
      deficiency: dto.dietPlan.deficiency,
      notes: dto.dietPlan.notes ?? null,
      calories_burned: dto.dietPlan.caloriesBurned,
      exercise: dto.dietPlan.exercise,
      start_date: dto.dietPlan.startDate ?? null,
      end_date: dto.dietPlan.endDate ?? null,
    })
    if (dietErr) throw new BadRequestException(dietErr.message)
  }

  // update appointment with report + mark as completed
  const { data: updated, error: updateErr } = await this.supabase
    .from('appointments')
    .update({
      status: 'completed',
      report: dto.report ?? appt.report,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (updateErr) throw new BadRequestException(updateErr.message)

  return this.toApi(updated as DbRow)
}

// Get all diet plans assigned by a nutritionist
async getAssignedDietPlans(nutritionistId: string) {
  const { data, error } = await this.supabase
    .from('diet_plan')
    .select('*')
    .eq('nutritionist_id', nutritionistId)
    .order('created_at', { ascending: false })

  if (error) throw new BadRequestException(error.message)
  if (!data) return []

  const enrichedPlans:any = []

  for (const plan of data) {
    // lookup patient from MongoDB
    const patient = await this.profileModel.findOne({ id: plan.patient_id }).lean()

    enrichedPlans.push({
      ...plan,
      patientName: patient?.name || ""
    })
  }

  return enrichedPlans
}




async updateDietPlan(
  dietPlanId: string,
  payload: Partial<{
    dailyCalories: string
    protein: string
    carbs: string
    fat: string
    deficiency: string
    notes: string
    caloriesBurned: string
    exercise: string
    startDate: string
    endDate: string
    nutritionist_id: string
  }>
) {
  console.log('--- updateDietPlan called ---')
  console.log('dietPlanId:', dietPlanId)
  console.log('payload:', payload)

  // first check ownership
  const { data: existing, error: fetchErr } = await this.supabase
    .from('diet_plan')
    .select('*')
    .eq('id', dietPlanId)
    .single()

  console.log('existing diet plan:', existing)
  console.log('fetchErr:', fetchErr)

  if (fetchErr?.message?.includes('No rows')) {
    console.error('Diet plan not found')
    throw new NotFoundException('Diet plan not found')
  }
  if (fetchErr) {
    console.error('Fetch error:', fetchErr)
    throw new BadRequestException(fetchErr.message)
  }
  if (existing.nutritionist_id !== payload.nutritionist_id) {
    console.error(
      'Ownership mismatch:',
      existing.nutritionist_id,
      'vs',
      payload.nutritionist_id,
    )
    throw new BadRequestException('You are not allowed to update this diet plan')
  }

  console.log('Updating diet plan...')
  // update
  const { data, error } = await this.supabase
    .from('diet_plan')
    .update({
      ...payload,
    })
    .eq('id', dietPlanId)
    .select()
    .single()

  console.log('update response data:', data)
  console.log('update response error:', error)

  if (error) {
    console.error('Update failed:', error)
    throw new BadRequestException(error.message)
  }

  // fetch patient profile from MongoDB
  const patient = await this.profileModel.findOne({ id: data.patient_id }).lean()

  const result = {
    ...data,
    patientName: patient?.name || ""
  }

  console.log('Diet plan updated successfully:', result)
  return result
}





}
