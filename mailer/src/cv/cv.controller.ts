import { Controller } from '@nestjs/common';
import { CvService } from './cv.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}


    @MessagePattern('cv-received')
    async handleCvRecEmail(@Payload() data) {
       await this.cvService.handleCvRecEmail(data)
      }
}
