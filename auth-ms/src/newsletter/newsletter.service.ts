import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js'
@Injectable()
export class NewsletterService {

  private readonly supabase: SupabaseClient
  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    )}

   async subscribe(email: string) {
     const { data, error } = await this.supabase.from('newsletter').insert({ email })
     if (error) throw new BadRequestException(error.message)
     return data
  }
}
