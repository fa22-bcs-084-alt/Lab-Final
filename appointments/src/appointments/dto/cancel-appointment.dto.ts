import { IsString, IsOptional, IsEnum } from 'class-validator'

export enum CancellationReason {
  Emergency = 'emergency',
  Scheduling = 'scheduling',
  PatientRequest = 'patient-request',
  Unavailable = 'unavailable',
  Other = 'other',
}

export enum CancelledBy {
  Doctor = 'doctor',
  Patient = 'patient',
}

export class CancelAppointmentDto {
  @IsEnum(CancellationReason, {
    message: 'A valid cancellation reason is required',
  })
  reason: CancellationReason

  @IsOptional()
  @IsString()
  notes?: string

  @IsEnum(CancelledBy, {
    message: 'cancelledBy must be either "doctor" or "patient"',
  })
  cancelledBy: CancelledBy
}
