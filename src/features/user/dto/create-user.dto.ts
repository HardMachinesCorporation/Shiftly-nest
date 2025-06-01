import { BaseUserDto } from './base-user.dto';
import { IsStrongPassword } from 'class-validator';

export class CreateUserDto extends BaseUserDto {
  @IsStrongPassword()
  readonly password: string;
}
