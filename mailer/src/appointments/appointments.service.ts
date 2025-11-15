import { Injectable } from '@nestjs/common';
import { generateAppointmentConfirmationEmail } from 'src/helpers/generateAppointmentConfirmationEmail'
import { generateAppointmentReminder30MinEmail } from 'src/helpers/generateAppointmentReminder30MinEmail';
import { generateAppointmentTomorrowEmail } from 'src/helpers/generateAppointmentTomorrowEmail';
import { AppointmentDto } from 'src/dto/appointment.dto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AppointmentsService {

    constructor(private mailService: MailService) {}


async handleAppointment(data: AppointmentDto) {
        console.log('Handling appointment in AppointmentsService:', data);
        await this.mailService.sendMail(
            data.patient_email,
            'Appointment Confirmation',
            generateAppointmentConfirmationEmail(data)
        );
    }

async handleThirtyMinAppointmentReminder(data: AppointmentDto) {
   console.log('Handling appointment in AppointmentsService:', data);
        await this.mailService.sendMail(
            data.patient_email,
            'Appointment Reminder - 30 Minutes',
            generateAppointmentReminder30MinEmail(data)
        );
  }

async handleOneDayAppointmentReminder(data: AppointmentDto) {
   console.log('Handling appointment in AppointmentsService:', data);
        await this.mailService.sendMail(
            data.patient_email,
            'Appointment Reminder - 1 Day',
            generateAppointmentTomorrowEmail(data)
        );
  }
}