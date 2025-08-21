import { Injectable,  NotFoundException } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
@Injectable()
export class LabTestsService {
   private supabase: SupabaseClient

    constructor(private configService: ConfigService) {
      this.supabase = createClient(
        this.configService.get<string>('SUPABASE_URL')!,
        this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      )
  
    
    }

  async createTest(dto: any) {
    const { data, error } = await this.supabase
      .from('lab_tests')
      .insert([dto])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getAllTests() {
    const { data, error } = await this.supabase
      .from('lab_tests')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data
  }

  async getTestById(id: string) {
    const { data, error } = await this.supabase
      .from('lab_tests')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) throw new NotFoundException('Lab test not found')
    return data
  }

  async updateTest(id: string, dto: any) {
    const { data, error } = await this.supabase
      .from('lab_tests')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new NotFoundException('Lab test not found')
    return data
  }

  async deleteTest(id: string) {
    const { data, error } = await this.supabase
      .from('lab_tests')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new NotFoundException('Lab test not found')
    return { success: true, deletedId: id }
  }
}
