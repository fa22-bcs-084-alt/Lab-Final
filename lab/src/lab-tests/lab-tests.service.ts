import { Injectable, Inject } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class LabTestsService {
  constructor(@Inject('SUPABASE') private readonly supabase: SupabaseClient) {}

  async create(dto) {
    const { data, error } = await this.supabase
      .from('lab_tests')
      .insert([{
        name: dto.name,
        description: dto.description,
        category: dto.category,
        price: dto.price,
        duration: dto.duration,
        preparation_instructions: dto.preparationInstructions
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async findAll() {
    const { data, error } = await this.supabase.from('lab_tests').select('*')
    if (error) throw error
    return data
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('lab_tests')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }
}
