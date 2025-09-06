import { Controller, Get } from '@nestjs/common';
import { NutritionistsService } from './nutritionists.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller('nutritionists')
export class NutritionistsController {
  constructor(private readonly nutritionistsService: NutritionistsService) {
 
  }

   @MessagePattern({ cmd: 'allNutritionist' })
  async getAll() {
    return await  this.nutritionistsService.findAll()
  }
}
