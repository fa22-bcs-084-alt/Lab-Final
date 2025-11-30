import { IsString, IsOptional, IsEmail } from 'class-validator'

export class AppointmentCancellationNotificationDto {
  @IsString()
  userId: string

  @IsString()
  type: string

  @IsString()
  title: string

  @IsString()
  message: string

  @IsOptional()
  data?: {
    appointmentId: string
    reason: string
  }
}

export class AppointmentCancellationDto {
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

  @IsString()
  cancellation_date: string

  @IsOptional()
  @IsString()
  cancellation_reason?: string

  @IsOptional()
  @IsString()
  cancellation_notes?: string
}
