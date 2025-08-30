import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator'
import { AppointmentMode, AppointmentStatus, AppointmentTypes } from '../appointment.enums'

export class CreateAppointmentDto {
  @IsUUID()
  patientId: string

  @IsUUID()
  doctorId: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string

  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  time: string

  @IsEnum(AppointmentStatus)
  status: AppointmentStatus

  @IsEnum(AppointmentTypes)
  type: AppointmentTypes

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsString()
  report?: string

  @IsEnum(AppointmentMode)
  mode: AppointmentMode

  @IsBoolean()
  dataShared: boolean
}
