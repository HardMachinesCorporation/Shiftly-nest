import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class AbstractHashingService {
  abstract hashPassword(password: string | Buffer): Promise<string>;
  abstract comparePassword(
    plainPassword: string | Buffer,
    encryptedPassword: string
  ): Promise<boolean>;
}
