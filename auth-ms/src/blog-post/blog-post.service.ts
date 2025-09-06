// src/blogPost/blogPost.service.ts
import { Inject, Injectable } from '@nestjs/common'
import { SupabaseClient,createClient } from '@supabase/supabase-js'
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/createBlogPost.dto'
import { ConfigService } from '@nestjs/config'


@Injectable()
export class BlogPostService {
    private readonly supabase: SupabaseClient
    constructor(private configService: ConfigService) {
       this.supabase = createClient(
            this.configService.get<string>('SUPABASE_URL')!,
            this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
          )
    }

  async create(dto: CreateBlogPostDto) {
    return this.supabase.from('blogPost').insert(dto).select()
  }

  async findAll() {
    return this.supabase.from('blogPost').select('*, category(*)')
  }

  async findOne(id: string) {
    return this.supabase.from('blogPost').select('*, category(*)').eq('id', id).single()
  }

  async update(id: string, dto: UpdateBlogPostDto) {
    return this.supabase.from('blogPost').update(dto).eq('id', id).select()
  }

  async remove(id: string) {
    return this.supabase.from('blogPost').delete().eq('id', id)
  }
}
