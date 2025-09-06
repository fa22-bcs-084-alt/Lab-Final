// src/blogCategory/blogCategory.service.ts
import {  Injectable } from '@nestjs/common'

import { CreateBlogCategoryDto, UpdateBlogCategoryDto } from './dto/createBlogCategory.dto'
 
import { SupabaseClient,createClient } from '@supabase/supabase-js'
import { ConfigService } from '@nestjs/config'


@Injectable()
export class BlogCategoryService {
    private readonly supabase: SupabaseClient
  constructor(private configService: ConfigService) {
     this.supabase = createClient(
          this.configService.get<string>('SUPABASE_URL')!,
          this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
        )
  }


  async create(dto: CreateBlogCategoryDto) {
    return this.supabase.from('blogCategory').insert(dto).select()
  }

  async findAll() {
    return this.supabase.from('blogCategory').select('*')
  }

  async findOne(id: string) {
    return this.supabase.from('blogCategory').select('*').eq('id', id).single()
  }

  async update(id: string, dto: UpdateBlogCategoryDto) {
    return this.supabase.from('blogCategory').update(dto).eq('id', id).select()
  }

  async remove(id: string) {
    return this.supabase.from('blogCategory').delete().eq('id', id)
  }
}
