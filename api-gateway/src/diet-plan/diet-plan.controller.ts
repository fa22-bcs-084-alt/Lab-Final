import { Controller, Inject ,Query,Get,Patch,Param ,Body} from "@nestjs/common"
import { ClientProxy } from "@nestjs/microservices"



@Controller('diet-plans')
export class DietPlanController {
  constructor(@Inject('APPOINTMENTS_SERVICE') private readonly client: ClientProxy) {}

  @Get('assigned')
  getAssigned(@Query('nutritionistId') nutritionistId: string) {
    return this.client.send({ cmd: 'get_assigned_diet_plans' }, nutritionistId)
  }

  @Patch(':id')
  update(
    @Param('id') dietPlanId: string,
    @Body() dto: any,
    @Body('nutritionistId') nutritionistId: string
  ) {
    return this.client.send({ cmd: 'update_diet_plan' }, { dietPlanId, nutritionistId, dto })
  }
}
