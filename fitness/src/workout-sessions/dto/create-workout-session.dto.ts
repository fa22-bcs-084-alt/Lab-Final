import { IsUUID, IsString, IsArray, IsInt } from 'class-validator';

export class CreateWorkoutSessionDto {
  @IsUUID()
  patientId: string;

  @IsString()
  routineId: string;

  @IsArray()
  exercises: any[];

  @IsInt()
  totalDuration: number;

  @IsInt()
  totalCalories: number;
}
