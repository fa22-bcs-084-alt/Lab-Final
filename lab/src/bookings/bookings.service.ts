import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { UsersService } from '../users/users.service'
import { LabTestsService } from '../lab-tests/lab-tests.service'

@Injectable()
export class BookingsService {
  constructor(
    @Inject('SUPABASE') private readonly supabase: SupabaseClient,
    private readonly users: UsersService,
    private readonly labTests: LabTestsService
  ) {}

  async create(dto) {
    const test = await this.labTests.findOne(dto.testId)
    if (!test) throw new NotFoundException('lab test not found')

    let labTechId = dto.labTechnicianId || null
    if (!labTechId) {
      const tech = await this.users.findRandomLabTechnician()
      labTechId = tech ? tech.id : null
    }

    const { data, error } = await this.supabase
      .from('booked_lab_tests')
      .insert([{
        test_id: dto.testId,
        patient_id: dto.patientId,
        lab_technician_id: labTechId,
        scheduled_date: dto.scheduledDate,
        scheduled_time: dto.scheduledTime,
        location: dto.location,
        instructions: dto.instructions
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }
}
