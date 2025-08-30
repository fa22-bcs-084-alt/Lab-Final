import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { AppointmentsService } from './appointments.service'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { CompleteNutritionistAppointmentDto } from './dto/complete-nutritionist-appointment.dto'
import { AppointmentMode, AppointmentStatus, AppointmentTypes } from './appointment.enums'

@Controller()
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @MessagePattern({ cmd: 'create_appointment' })
  create(@Payload() dto: CreateAppointmentDto) {
    return this.svc.create(dto)
  }

  @MessagePattern({ cmd: 'find_all_appointments' })
  findAll(
    @Payload()
    query: {
      patientId?: string
      doctorId?: string
      status?: AppointmentStatus
      type?: AppointmentTypes
      mode?: AppointmentMode
      from?: string
      to?: string
      limit?: number
      offset?: number
    },
  ) {
    return this.svc.findAll(query)
  }

  @MessagePattern({ cmd: 'find_one_appointment' })
  findOne(@Payload() id: string) {
    return this.svc.findOne(id)
  }

  @MessagePattern({ cmd: 'update_appointment' })
  update(@Payload() payload: { id: string; dto: UpdateAppointmentDto }) {
    return this.svc.update(payload.id, payload.dto)
  }

  @MessagePattern({ cmd: 'remove_appointment' })
  remove(@Payload() id: string) {
    return this.svc.remove(id)
  }

  @MessagePattern({ cmd: 'complete_nutritionist_appointment' })
  completeNutritionistAppointment(
    @Payload()
    payload: { id: string; dto: CompleteNutritionistAppointmentDto; nutritionistId: string },
  ) {
    return this.svc.completeNutritionistAppointment(payload.id, payload.dto, payload.nutritionistId)
  }


  @MessagePattern({ cmd: 'get_assigned_diet_plans' })
getAssignedDietPlans(@Payload() nutritionistId: string) {
  return this.svc.getAssignedDietPlans(nutritionistId)
}

@MessagePattern({ cmd: 'update_diet_plan' })
updateDietPlan(@Payload() payload: { dietPlanId: string; nutritionistId: string; dto: any }) {
  return this.svc.updateDietPlan(payload.dietPlanId, payload.dto)
}

}
