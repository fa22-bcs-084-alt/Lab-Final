import { IsUUID, IsString, IsDateString } from "class-validator"

export class AvailableSlotsQueryDto {
 @IsUUID()
  providerId: string

  @IsString()
  role: string

  @IsDateString()
  date: string
}
