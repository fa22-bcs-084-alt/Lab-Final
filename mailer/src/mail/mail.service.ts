import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer'
import { ConfigService } from '@nestjs/config'
@Injectable()
export class MailService {

  private transporter: nodemailer.Transporter

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS')
      }
    })
  }



   async sendMail(to: string, subject: string, html: string) {
    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject,
      html
    })
  }

}
