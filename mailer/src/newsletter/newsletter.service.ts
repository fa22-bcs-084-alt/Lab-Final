import { Injectable } from '@nestjs/common';
import { generateNewsletterSubscriptionEmail } from 'src/helpers/generateNewsletterSubscriptionEmail';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class NewsletterService {


 constructor(private mailService: MailService) {}

    
    async handleWelcomeNewsletterEmail(data) {
     
        console.log(`Sending welcome newsletter email to ${data.email}`);
         await this.mailService.sendMail(
                    data.email,
                    'Welcome to Our Newsletter',
                    generateNewsletterSubscriptionEmail(data.email)
                );
        
    }
}
