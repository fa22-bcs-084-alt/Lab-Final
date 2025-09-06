import { Controller, Get,Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('nutritionists')
export class NutritionistsController {
 
  constructor(
      @Inject('AUTH_SERVICE') private readonly Nutritionist: ClientProxy,
    ) {}

   @Get()
    async listAll() {
      return firstValueFrom(
        this.Nutritionist.send({ cmd: 'allNutritionist' },{}),
      )
    }
}
