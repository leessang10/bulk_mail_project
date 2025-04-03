import { IsArray, IsString } from 'class-validator';

export class AddRecipientsDto {
  @IsArray()
  @IsString({ each: true })
  recipientIds: string[];
}
