import { Injectable } from '@nestjs/common';
import { MailService } from 'src/mail/mail.service';
import { LabBookingConfirmationDto } from './dtos/lab-booking-confirmation.dto';
import { generateLabTestConfirmationEmail } from 'src/helpers/generateLabTestConfirmationEmail';
import { generateLabTestReminder30MinsEmail } from 'src/helpers/generateLabTestReminder30MinsEmail';
import { generateLabTestReminderTomorrowEmail } from 'src/helpers/generateLabTestReminderTomorrowEmail';
import { LabReportCompletionDto } from './dtos/lab-report-completion.dto';
import { generateLabReportCompletionEmail } from 'src/helpers/generateLabReportCompletionEmail';
import { generateScanReportCompletionEmail } from 'src/helpers/generateScanReportCompletionEmail';
import { ScanReportCompletionDto } from './dtos/scan-report-completion.dto';

@Injectable()
export class LabsService {

    constructor(private readonly mailService: MailService) {}

    async processLabTestBookingConfirmation(data: LabBookingConfirmationDto) {
        console.log('Processing lab test booking confirmation:', data);
        const {patient_email} = data;
     
        this.mailService.sendMail(
            patient_email,
            'Lab Test Booking Confirmation',
             generateLabTestConfirmationEmail(data)
          );
    }
    async processLabTestThirtyMinReminder(data: LabBookingConfirmationDto) {
        const {patient_email} = data;
        this.mailService.sendMail(
            patient_email,
            'Lab Test 30-Minute Reminder',
             generateLabTestReminder30MinsEmail(data)
          );
    }
    async processLabTestOneDayReminder(data: LabBookingConfirmationDto) {
        const {patient_email} = data;
        this.mailService.sendMail(
            patient_email,
            'Lab Test 1-Day Reminder',
             generateLabTestReminderTomorrowEmail(data)
          );
    }
    async processLabReportAvailable(data: LabReportCompletionDto) {
        const {patient_email} = data;
        this.mailService.sendMail(
            patient_email,
            'Your Lab Report is Ready',
             generateLabReportCompletionEmail(data)
          );
    }

    async processScanReportAvailable(data: ScanReportCompletionDto) {
        const {patient_email} = data;
        this.mailService.sendMail(
            patient_email,
            'Your Scan Report is Ready',
             generateScanReportCompletionEmail(data)
          );
    }
}