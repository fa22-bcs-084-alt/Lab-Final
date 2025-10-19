import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class NotificationsService {

     private readonly supabase: SupabaseClient
    
      constructor(private configService: ConfigService,
   
      ) {
        this.supabase = createClient(
          this.configService.get<string>('SUPABASE_URL')!,
          this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
        )
      }



   async getNutritionistNotifications(nutritionistId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', nutritionistId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    console.log('[NotificationsService] Fetched notifications for nutritionist:', data.length)
    return data
  }

  async markAllAsRead(userId: string) {
  const { error } = await this.supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) throw new Error(error.message)
  return { message: 'All notifications marked as read' }
}


}
