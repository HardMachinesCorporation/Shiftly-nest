import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { AbstractHashingService } from './abstract/hashing.service';
import { BcryptProvider } from './implementation/providers/bcrypt/bcrypt.provider';

@Module({
  imports: [],
  providers: [
    PasswordService,
    {
      provide: AbstractHashingService,
      useClass: BcryptProvider,
    },
  ],
  exports: [PasswordService, AbstractHashingService],
})
export class PasswordModule {}
