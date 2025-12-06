import { Injectable } from '@nestjs/common';
import { generateOtpVerificationEmail } from 'src/helpers/generateOtpVerificationEmail';
import { generatePasswordResetOtpEmail } from 'src/helpers/generatePasswordResetOtpEmail';
import { generateWelcomeEmail } from 'src/helpers/generateWelcomeEmail';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(private mailService: MailService) {}

  /**
   * Send OTP verification email for new user registration
   */
  async handleOtpVerificationEmail(data: { email: string; otp: string }) {
    console.log(`[MAILER SERVICE] Sending OTP verification email to ${data.email}`);
    await this.mailService.sendMail(
      data.email,
      'Verify Your Email - Hygieia',
      generateOtpVerificationEmail(data.email, data.otp)
    );
  }

  /**
   * Send password reset OTP email
   */
  async handlePasswordResetOtpEmail(data: { email: string; otp: string }) {
    console.log(`[MAILER SERVICE] Sending password reset OTP email to ${data.email}`);
    await this.mailService.sendMail(
      data.email,
      'Password Reset Request - Hygieia',
      generatePasswordResetOtpEmail(data.email, data.otp)
    );
  }

  /**
   * Send welcome email after successful email verification
   */
  async handleWelcomeEmail(data: { email: string; name?: string }) {
    console.log(`[MAILER SERVICE] Sending welcome email to ${data.email}`);
    await this.mailService.sendMail(
      data.email,
      'Welcome to Hygieia - Your Healthcare Journey Begins!',
      generateWelcomeEmail(data.email, data.name)
    );
  }
}
