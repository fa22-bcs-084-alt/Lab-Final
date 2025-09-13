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
    this.logger("Appointment creation called for patient id="+dto.patientId)
    const payload = this.toDb(dto)
    
    const { data, error } = await this.supabase.from('appointments').insert(payload).select().single()
    if (error) {
      this.logger("APPOINTMENT CREATION ERROR OCCURED ERROR: "+error)
      throw new BadRequestException(error.message)
    }
   this.logger("APPOINTMENT CREATED FOR PATIENT ID= "+payload.patient_id +" doctor id= "+payload.doctor_id +" at "+data.created_at)  
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
  this.logger("APPOINTMENT QUERY CALLED, QUERY="+JSON.stringify(query,null,2))
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

  this.logger("Total APPOINTMENT ITEMS RETURNED ARE "+(count ?? 0))
  return { items, count: count ?? 0 }
}


  async findOne(id: string): Promise<ApiRow> {
    this.logger(" FINDING APPOINTMENT FOR ID="+id)
    const { data, error } = await this.supabase.from('appointments').select('*').eq('id', id).single()
    if (error?.message?.includes('No rows')) throw new NotFoundException('appointment not found')
    if (error) throw new BadRequestException(error.message)
    this.logger(" APPOINTMENT FOR ID "+id+ " FOUND")  
    return this.toApi(data as DbRow)
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<ApiRow> {
    this.logger(" APPOINTMENT UPDATE CALLED FOR APPOINTMENT ID="+id+" PAYLOAD= "+dto)
    const payload = this.toDb(dto)

    const { data, error } = await this.supabase.from('appointments').update(payload).eq('id', id).select().single()
    if (error?.message?.includes('No rows')) throw new NotFoundException('appointment not found')
    if (error) throw new BadRequestException(error.message)
    this.logger(" ")  
  this.logger(" APPOINTMENT UPDATED SUCCESSFULLY APPOINTMENT FOR= "+id)
    return this.toApi(data as DbRow)
  }

  async remove(id: string): Promise<{ id: string; deleted: boolean }> {
    this.logger(" APPOINTMENT CANCEL CALLED FOR APPOINTMENT ID= "+id)
    const { error } = await this.supabase.from('appointments').delete().eq('id', id)
    if (error) throw new BadRequestException(error.message)
      this.logger(" APPOINTMENT CANCEL SUCCESSFULLY FOR APPOINTMENT ID= "+id)
    return { id, deleted: true }
  }



  async completeNutritionistAppointment(
  id: string,
  dto: CompleteNutritionistAppointmentDto,
  nutritionistId: string
): Promise<ApiRow> {
  this.logger(" COMPLETE NUTRITIONIST APPOINTMENT CALLED FOR NUTRITIONIST ID= "+nutritionistId)
  // fetch appointment
  const { data: appointment, error } = await this.supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single()

   this.logger(" NUTRITIONIST APPOINTMENT FOUND FOR NUTRITIONIST ID= "+nutritionistId+ " APPOINTMENT ID"+appointment.id)

  if (error?.message?.includes('No rows')) throw new NotFoundException('appointment not found')
  if (error) throw new BadRequestException(error.message)

  const appt = appointment as DbRow

if (dto.referredTestIds && dto.referredTestIds.length > 0) {
  const inserts = dto.referredTestIds.map(testId => ({
    test_id: testId,
    patient_id: appt.patient_id,
    referrer_id: nutritionistId,
  }))

   this.logger("NUTRITIONIST REFERRED TOTAL "+inserts.length+" TEST(s)")
  const { error: testErr } = await this.supabase.from('referred_tests').insert(inserts)
  if (testErr) throw new BadRequestException(testErr.message)
}

  this.logger("REFERRED ALL TEST(s) TO THE PATIENT")
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
      
    this.logger("DIET PLAN ASSIGNED TO THE PATIENT")
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
    
    this.logger("APPOINTMENT STATUS UPDATED FOR THE PATIENT")

  return this.toApi(updated as DbRow)
}

// Get all diet plans assigned by a nutritionist
async getAssignedDietPlans(nutritionistId: string) {
    this.logger("FETCHING DIET PLANS FOR NUTRITIONIST ID= "+nutritionistId)
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
  this.logger("TOTAL "+enrichedPlans.length+ " DIET PLANS FOUND FOR NUTRITIONIST")
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
  this.logger('--- updateDietPlan called ---')
  this.logger('dietPlanId:'+ dietPlanId)
  this.logger('payload:'+ payload)

  // first check ownership
  const { data: existing, error: fetchErr } = await this.supabase
    .from('diet_plan')
    .select('*')
    .eq('id', dietPlanId)
    .single()

  this.logger('existing diet plan:'+ existing)
  this.logger('fetchErr:'+ fetchErr)

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

  this.logger('Updating diet plan...')
  // update
  const { data, error } = await this.supabase
    .from('diet_plan')
    .update({
      ...payload,
    })
    .eq('id', dietPlanId)
    .select()
    .single()

  this.logger('update response data:'+ data)
  this.logger('update response error:'+ error)

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

  this.logger('Diet plan updated successfully:'+ result)
  return result
}


// inside AppointmentsService

async getActiveDietPlansForPatient(patientId: string) {
  this.logger("FETCHING ACTIVE DIET PLANS FOR PATIENT ID= " + patientId)

  const today = new Date().toISOString().split("T")[0] // yyyy-mm-dd

  const { data, error } = await this.supabase
    .from("diet_plan")
    .select("*")
    .eq("patient_id", patientId)
    .or(`start_date.is.null,and(start_date.lte.${today})`)
    .or(`end_date.is.null,and(end_date.gte.${today})`)
    .order("created_at", { ascending: false })

  if (error) {
    this.logger("ERROR FETCHING ACTIVE DIET PLANS " + error.message)
    throw new BadRequestException(error.message)
  }

  if (!data) return []

  const enrichedPlans: any[] = []
  for (const plan of data) {
    const nutritionist = await this.profileModel.findOne({ id: plan.nutritionist_id }).lean()
    enrichedPlans.push({
      ...plan,
      nutritionistName: nutritionist?.name || "",
    })
  }

  this.logger("TOTAL " + enrichedPlans.length + " ACTIVE DIET PLANS FOUND FOR PATIENT")
  return enrichedPlans
}




  logger(msg:string){
   console.log("[INFO APPOINTMENT SERVICE] "+msg)
  }

}
