export class LabBookingCancellationDto {
  booking_id: string;
  patient_id: string;
  patient_email: string;
  patient_name?: string;
  test_name: string;
  scheduled_date: string;
  scheduled_time: string;
  location?: string;
  cancellation_date: string;
}
