import { Test, TestingModule } from '@nestjs/testing';
import { MoneyService } from './money.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MoneyService', () => {
  let service: MoneyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoneyService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<MoneyService>(MoneyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
