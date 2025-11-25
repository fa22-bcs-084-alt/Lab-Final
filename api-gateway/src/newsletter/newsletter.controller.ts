import { Controller, Inject, Post ,Body} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices/client/client-proxy';
import { SubscribeNewsletterDto } from './dto/subscribeNewsletter.dto';
import { firstValueFrom } from 'rxjs';

@Controller()
export class NewsletterController {
   constructor(@Inject('AUTH_SERVICE') private authClient: ClientProxy) {}
  
  @Post('subscribe-newsletter')
  async subscribe(@Body() dto: SubscribeNewsletterDto) {
      return await firstValueFrom(
          this.authClient.send(
            { cmd: 'subscribe-newsletter' },
            dto
          )
        )
  }

}
