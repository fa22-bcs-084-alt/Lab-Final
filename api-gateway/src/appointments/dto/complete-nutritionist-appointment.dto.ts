// dto/complete-nutritionist-appointment.dto.ts
import { IsOptional, IsString, IsUUID, IsArray } from 'class-validator'

export class CompleteNutritionistAppointmentDto {
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  referredTestIds?: string[]

  @IsOptional()
  @IsString()
  report?: string

  @IsOptional()
  dietPlan?: {
    dailyCalories: string
    protein: string
    carbs: string
    fat: string
    deficiency: string
    notes?: string
    caloriesBurned: string
    exercise: string
    startDate?: string
    endDate?: string
  }
}
