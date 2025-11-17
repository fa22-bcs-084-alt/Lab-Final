export class ScanReportCompletionDto {
  booking_id: string;
  patient_id: string;
  patient_email: string;
  patient_name?: string;
  report_url: string;
  test_name?: string;
}
