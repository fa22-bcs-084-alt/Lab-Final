import { IsUUID, IsString, IsDateString } from "class-validator"

export class AvailableSlotsQueryDto {
 @IsString()
  providerId: string

  @IsString()
  role: string

  @IsDateString()
  date: string
}
