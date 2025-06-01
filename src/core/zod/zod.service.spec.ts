import { Test, TestingModule } from '@nestjs/testing';
import { ZodService } from './zod.service';

describe('ZodService', () => {
  let service: ZodService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZodService],
    }).compile();

    service = module.get<ZodService>(ZodService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
