import { Controller } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
    @MessagePattern({ cmd: 'get_notifications' })
  async getNutritionistNotifications(nutritionistId: string) {
    return await this.notificationsService.getNotifications(nutritionistId);
  }
    @MessagePattern({ cmd: 'mark_all_as_read' })
  async markAllAsRead(userId: string) {
    return await this.notificationsService.markAllAsRead(userId);
  }
}
