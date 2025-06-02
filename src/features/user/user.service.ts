import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CrudAbstractService } from '../../shared/abstracts/crud/crud-abstract.service';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { z } from 'zod';
import { PasswordService } from '../password/password.service';
import { ZodService } from '../../core/zod/zod.service';
import { zod } from '../../shared/config/zod-config.singleton';
export const EmailSchema = z.object({
  email: z.string().trim().email(),
});
export type ValidEmail = z.infer<typeof EmailSchema>;

@Injectable()
export class UserService extends CrudAbstractService<User> {
  private readonly workingEnvironment: ZodService = zod;

  constructor(
    @InjectRepository(User) repository: Repository<User>,
    private readonly passwordService: PasswordService
  ) {
    super(repository, UserService.name);
  }

  /**
   * Checks if an email address already exists in the database.
   *
   * Performs a two-step validation:
   * 1. Validates the email format using Zod schema (must match: `${string}@${string}.${string}`)
   * 2. Checks for existing user with the normalized email (trimmed lowercase)
   *
   * @param {ValidEmail} email - The email address to verify. Either:
   *    - A raw string (will be validated and normalized)
   *    - A pre-validated object from `EmailSchema.parse()`
   *
   * @returns {Promise<boolean>}
   *    - `true` if a user exists with this exact normalized email
   *    - `false` if email is valid but not registered
   *
   * @throws {BadRequestException} (HTTP 400) - When email fails Zod validation:
   *    - Not a string
   *    - Invalid email format
   *    - Empty after trimming
   *
   * @example
   * // With raw string (auto-validated)
   * await isThisEmailAlreadyInDb(' user@EXAMPLE.com '); // → false
   *
   * @example
   * // With pre-validated email
   * const validated = EmailSchema.parse({ email: 'test@domain.com' });
   * await isThisEmailAlreadyInDb(validated); // → true
   *
   * @see {@link EmailSchema} - Zod schema requiring:
   *    - String input
   *    - `.trim()` removal of whitespace
   *    - Valid email format via `.email()`
   * @see {@link ValidEmail} - Inferred type: { email: string }
   */
  async isThisEmailAlreadyInDb(email: string | ValidEmail): Promise<boolean> {
    const safeEmail = EmailSchema.safeParse(email);
    if (safeEmail.success) {
      return await this.repository.exists({
        where: { email } as FindOptionsWhere<User>,
      });
    }
    throw new BadRequestException('Please provide valid email');
  }

  /**
   * @throws {BadRequestException} When email already exists
   * @throws {InternalServerErrorException} When password hashing fails
   */
  async registerUser(customer: CreateUserDto) {
    // Start the chrono
    const startTime = Date.now();
    const providedEmail = customer.email;
    const providedPassword = customer.password;

    const conflictFound: boolean = await this.isThisEmailAlreadyInDb({
      email: providedEmail,
    });

    if (conflictFound) {
      throw new BadRequestException({ message: 'Email already exists' });
    }

    // Throws:HttpException – When hashing fails (500 Internal Server Error)
    const securePassword =
      await this.passwordService.protectPassword(providedEmail);
    if (!securePassword) {
      this.logger.error(`[${UserService.name}] : Failed to save credentials `);
      throw new InternalServerErrorException('Something went wrong');
    }

    const newCustomer = await this.createEntity({
      ...customer,
      password: providedPassword,
    });

    const endTime = Date.now();
    return {
      success: true,
      message: `Greeting ${newCustomer.name} `,
      executionTime: `${endTime - startTime}ms`,
      data: this.workingEnvironment.isDev
        ? newCustomer
        : { userID: newCustomer.userRef, email: newCustomer.email },
    };
  }
}
