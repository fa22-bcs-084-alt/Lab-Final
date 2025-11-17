import { Controller, Get, Inject, Param, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ClientProxy } from '@nestjs/microservices';

@Controller('notifications')
export class NotificationsController {
 
  constructor(@Inject('AUTH_SERVICE') private readonly notifications: ClientProxy) {}

    @Get(':id')
  async getNutritionistNotifications(@Param('id') id: string) {
    return await this.notifications.send({ cmd: 'get_notifications' }, id).toPromise();
  }

  
   @Patch('mark-read/:id')
  async markAllAsRead(@Param('id') id: string) {
    return await this.notifications.send({ cmd: 'mark_all_as_read' }, id).toPromise();
  }

}
