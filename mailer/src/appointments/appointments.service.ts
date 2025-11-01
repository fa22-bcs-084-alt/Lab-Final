import { Injectable } from '@nestjs/common';
import { generateAppointmentConfirmationEmail } from 'helpers/generateConfirmationEmail';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AppointmentsService {

    constructor(private mailService: MailService) {}


async handleAppointment(data: {patient_id: string, doctor_id: string, patient_name: string, doctor_name: string, appointment_date: string, appointment_time: string, patient_email: string, link: string | null,appointment_mode: string}) {
        console.log('Handling appointment in AppointmentsService:', data);
        await this.mailService.sendMail(
            data.patient_email,
            'Appointment Confirmation',
            generateAppointmentConfirmationEmail(data)
        );
    }
}