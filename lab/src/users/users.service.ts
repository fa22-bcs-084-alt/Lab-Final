import { Injectable, Inject } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class UsersService {
  constructor(@Inject('SUPABASE') private readonly supabase: SupabaseClient) {}

  async findRandomLabTechnician() {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('role', 'lab_technician')
      .order('random()')
      .limit(1)

    if (error) throw error
    return data?.[0] || null
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }
}
