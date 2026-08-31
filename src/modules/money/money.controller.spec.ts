import { Test, TestingModule } from '@nestjs/testing';
import { MoneyController } from './money.controller';
import { MoneyService } from './money.service';
import { FinancialGuidanceService } from './financial-guidance.service';

describe('MoneyController', () => {
  let controller: MoneyController;
  const getGuidance = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoneyController],
      providers: [
        { provide: MoneyService, useValue: {} },
        { provide: FinancialGuidanceService, useValue: { getGuidance } },
      ],
    }).compile();

    controller = module.get<MoneyController>(MoneyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates financial guidance for the authenticated user', async () => {
    getGuidance.mockResolvedValue({ mode: 'adjusted' });
    await expect(controller.getGuidance('user-id')).resolves.toEqual({
      mode: 'adjusted',
    });
    expect(getGuidance).toHaveBeenCalledWith('user-id');
  });
});
