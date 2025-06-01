import IUser from '../../../shared/types/user/user.interface';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class BaseUserDto implements IUser {
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(50)
  readonly name: string;
  @IsString()
  @IsOptional()
  avatar: string;
}
