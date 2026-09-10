import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AddMemberDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  userId: number;
}
