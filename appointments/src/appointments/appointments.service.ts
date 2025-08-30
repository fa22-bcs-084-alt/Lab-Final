import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE } from '../supabase/supabase.module'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { AppointmentMode, AppointmentStatus, AppointmentTypes } from './appointment.enums'

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
  constructor(@Inject(SUPABASE) private readonly supabase: SupabaseClient) {}

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
  }): Promise<{ items: ApiRow[]; count: number }> {
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
    return { items: (data as DbRow[]).map(this.toApi.bind(this)), count: count ?? 0 }
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
}
