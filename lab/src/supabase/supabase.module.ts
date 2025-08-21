import { Module, Global } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'

@Global()
@Module({
  providers: [
    {
      provide: 'SUPABASE',
      useFactory: () => {
        return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)
      }
    }
  ],
  exports: ['SUPABASE']
})
export class SupabaseModule {}
