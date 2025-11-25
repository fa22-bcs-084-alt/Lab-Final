import { Injectable } from '@nestjs/common';
import { generateCvReceivedEmail } from 'src/helpers/generateCvReceivedEmail';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class CvService {


     constructor(private mailService: MailService) {}



    async handleCvRecEmail(data: any) {
        console.log('[MAILER MS] CV received email data:', data);

           await this.mailService.sendMail(
                            data.email,
                            'Your CV has been received',
                            generateCvReceivedEmail()
                        );
    }
}
