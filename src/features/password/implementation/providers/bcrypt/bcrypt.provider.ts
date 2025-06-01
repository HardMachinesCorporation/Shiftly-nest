import { Injectable } from '@nestjs/common';
import { AbstractHashingService } from '../../../abstract/hashing.service';
import { zod } from '../../../../../shared/config/zod-config.singleton';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BcryptProvider implements AbstractHashingService {
  private readonly saltRound: number = zod.get('SALT_ROUND');

  constructor() {
    console.log(
      `saltround is :${this.saltRound} of type ${typeof this.saltRound}`
    );
  }

  async comparePassword(
    plainPassword: string | Buffer,
    encryptedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(String(plainPassword), encryptedPassword);
  }

  async hashPassword(password: string | Buffer): Promise<string> {
    const salt = await bcrypt.genSalt(this.saltRound);
    return await bcrypt.hash(String(password), salt);
  }
}
