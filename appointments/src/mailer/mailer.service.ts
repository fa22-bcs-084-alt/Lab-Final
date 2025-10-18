import { Injectable } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

@Injectable()
export class MailerService {
  private transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  }

  
  async sendMail(
    to: string,
    subject: string,
    text: string,
    html?: string
  ) {
    await this.transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to,
      subject,
      text,
      html,
    })
  }

  async sendAppointmentConfirmation(
    patientEmail: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    appointmentTime: string,
    mode: string,
    meetLink?: string
  ) {
    const subject = 'Appointment Confirmation - Hygieia Health'
    
    const textMessage = `Dear ${patientName},

Your appointment has been successfully booked with Dr. ${doctorName}.

Appointment Details:
- Date: ${appointmentDate}
- Time: ${appointmentTime}
- Mode: ${mode}
${mode === 'online' && meetLink ? `- Meeting Link: ${meetLink}` : ''}

Please arrive on time for your appointment. If you have any questions or need to reschedule, please contact us.

Best regards,
Hygieia Health Team`

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Confirmed</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Hygieia Health</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
          <p style="font-size: 18px; margin-bottom: 20px;">Dear ${patientName},</p>
          
          <p style="margin-bottom: 20px;">Your appointment has been successfully booked with <strong>Dr. ${doctorName}</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #667eea; margin-top: 0;">Appointment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Date:</td>
                <td style="padding: 8px 0;">${appointmentDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Time:</td>
                <td style="padding: 8px 0;">${appointmentTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Mode:</td>
                <td style="padding: 8px 0; text-transform: capitalize;">${mode}</td>
              </tr>
              ${mode === 'online' && meetLink ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Meeting Link:</td>
                <td style="padding: 8px 0;">
                  <a href="${meetLink}" style="color: #667eea; text-decoration: none; background: #f0f4ff; padding: 5px 10px; border-radius: 4px; display: inline-block;">Join Meeting</a>
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Important:</strong> Please arrive on time for your appointment. 
              ${mode === 'online' ? 'Click the meeting link 5 minutes before your scheduled time.' : 'For physical appointments, please arrive 10 minutes early.'}
            </p>
          </div>
          
          <p style="margin-bottom: 20px;">If you have any questions or need to reschedule, please contact us.</p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              Best regards,<br>
              <strong>Hygieia Health Team</strong>
            </p>
          </div>
        </div>
      </div>
    `

    await this.sendMail(patientEmail, subject, textMessage, htmlMessage)
  }
}
