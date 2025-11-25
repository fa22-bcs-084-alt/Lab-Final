import { IsEmail, IsNotEmpty } from 'class-validator'

export class SubscribeNewsletterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string
}