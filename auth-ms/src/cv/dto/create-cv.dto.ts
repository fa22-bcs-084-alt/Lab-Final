import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator'

export class CreateCvDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  phone : string

  @IsEmail()
  email: string

  @IsEnum(['doctor', 'nutritionist', 'lab_technician'])
  role: string

  @IsOptional()
  @IsString()
  medicalSpecialization?: string

  @IsOptional()
  @IsUrl()
  cvLink?: string
}
