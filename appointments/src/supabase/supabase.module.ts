import { Module, Global } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE = 'SUPABASE'

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    {
      provide: SUPABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SupabaseClient => {
        const url = config.get<string>('SUPABASE_URL')
        const key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY')
        return createClient(url as string, key as string, { auth: { persistSession: false } })
      },
    },
  ],
  exports: [SUPABASE],
})
export class SupabaseModule {}
