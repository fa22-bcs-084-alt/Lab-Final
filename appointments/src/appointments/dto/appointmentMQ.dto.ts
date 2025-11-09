import { IsString, IsOptional, IsEmail } from 'class-validator'

export class AppointmentMQDto {
  @IsString()
  appointment_id: string

  @IsString()
  patient_id: string

  @IsString()
  doctor_id: string

  @IsEmail()
  patient_email: string

  @IsString()
  patient_name: string

  @IsString()
  doctor_name: string

  @IsString()
  appointment_date: string

  @IsString()
  appointment_time: string

  @IsString()
  appointment_mode: string

  @IsOptional()
  @IsString()
  appointment_link?: string
}
