import { PrismaService } from '../../prisma/prisma.service';
import { calculateDailyProgress } from '../progress/daily-progress';
import { RoutinesService } from './routines.service';

jest.mock('../progress/daily-progress', () => ({
  calculateDailyProgress: jest.fn(),
}));

const calculateProgress = calculateDailyProgress as jest.MockedFunction<
  typeof calculateDailyProgress
>;

describe('RoutinesService', () => {
  beforeEach(() => {
    calculateProgress.mockReset().mockResolvedValue({} as never);
  });

  it('combines schedules and logs for the requested day', async () => {
    const prisma = {
      routine: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'routine-id',
            name: 'Weekday routine',
            schedules: [
              {
                routineItemId: null,
                dayOfWeek: 3,
                isActive: true,
              },
            ],
            items: [
              {
                id: 'done-id',
                title: 'Gym',
                description: null,
                priority: 'high',
                isRequired: true,
                logs: [
                  {
                    id: 'log-id',
                    status: 'done',
                    logDate: new Date('2026-07-15T00:00:00.000Z'),
                  },
                ],
              },
              {
                id: 'pending-id',
                title: 'Study',
                description: null,
                priority: 'medium',
                isRequired: true,
                logs: [],
              },
            ],
          },
        ]),
      },
    } as unknown as PrismaService;

    const result = await new RoutinesService(prisma).getToday(
      {
        date: '2026-07-15',
      },
      'user-id',
    );

    expect(result.items.map((item) => item.status)).toEqual([
      'done',
      'pending',
    ]);
    expect(result.summary).toMatchObject({
      total: 2,
      done: 1,
      pending: 1,
      completionPercent: 50,
    });
  });

  it('summarizes only active items scheduled for Sunday', async () => {
    const date = new Date('2026-08-23T00:00:00.000Z');
    const scheduled = [
      ['done-1', 'done'],
      ['done-2', 'done'],
      ['done-3', 'done'],
      ['skipped', 'skipped'],
      ['missed', 'missed'],
    ].map(([id, status]) => ({
      id,
      title: id,
      description: null,
      priority: 'medium',
      isRequired: true,
      logs: [{ id: `log-${id}`, status, logDate: date }],
    }));
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'routine-id',
        name: 'Sunday routine',
        schedules: [
          { routineItemId: null, dayOfWeek: 0, isActive: true },
          { routineItemId: 'monday-only', dayOfWeek: 1, isActive: true },
        ],
        items: [
          ...scheduled,
          {
            id: 'monday-only',
            title: 'Monday only',
            description: null,
            priority: 'medium',
            isRequired: true,
            logs: [{ id: 'log-monday', status: 'done', logDate: date }],
          },
        ],
      },
    ]);
    const prisma = { routine: { findMany } } as unknown as PrismaService;

    const summary = await new RoutinesService(prisma).getSummaryForDate(
      date,
      'user-id',
    );

    expect(summary).toMatchObject({
      total: 5,
      done: 3,
      skipped: 1,
      missed: 1,
      completionPercent: 60,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-id', status: 'active' }),
        include: expect.objectContaining({
          items: expect.objectContaining({
            where: { userId: 'user-id', isActive: true },
          }),
        }),
      }),
    );
  });

  it('recalculates progress after creating a routine log', async () => {
    const date = new Date('2026-08-23T00:00:00.000Z');
    const prisma = {
      routineItem: {
        findFirst: jest.fn().mockResolvedValue({ routineId: 'routine-id' }),
      },
      routineLog: {
        upsert: jest.fn().mockResolvedValue({ id: 'log-id', logDate: date }),
      },
    } as unknown as PrismaService;
    const service = new RoutinesService(prisma);
    const summary = routineSummary(100);
    jest.spyOn(service, 'getSummaryForDate').mockResolvedValue(summary);

    await service.createLog(
      {
        routineId: 'routine-id',
        routineItemId: 'item-id',
        logDate: '2026-08-23',
        status: 'done',
      },
      'user-id',
    );

    expect(calculateProgress).toHaveBeenCalledWith(
      prisma,
      date,
      'user-id',
      summary,
    );
  });

  it('recalculates progress after changing done to pending', async () => {
    const date = new Date('2026-08-23T00:00:00.000Z');
    const prisma = {
      routineLog: {
        findFirst: jest.fn().mockResolvedValue({ id: 'log-id', logDate: date }),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'log-id', status: 'pending' }),
      },
    } as unknown as PrismaService;
    const service = new RoutinesService(prisma);
    const summary = routineSummary(0);
    jest.spyOn(service, 'getSummaryForDate').mockResolvedValue(summary);

    await service.updateLog('log-id', { status: 'pending' }, 'user-id');

    expect(calculateProgress).toHaveBeenCalledWith(
      prisma,
      date,
      'user-id',
      summary,
    );
  });

  it('recalculates progress after deleting a routine log', async () => {
    const date = new Date('2026-08-23T00:00:00.000Z');
    const prisma = {
      routineLog: {
        findFirst: jest.fn().mockResolvedValue({ id: 'log-id', logDate: date }),
        delete: jest.fn().mockResolvedValue({ id: 'log-id', logDate: date }),
      },
    } as unknown as PrismaService;
    const service = new RoutinesService(prisma);
    const summary = routineSummary(0);
    jest.spyOn(service, 'getSummaryForDate').mockResolvedValue(summary);

    await service.removeLog('log-id', 'user-id');

    expect(calculateProgress).toHaveBeenCalledWith(
      prisma,
      date,
      'user-id',
      summary,
    );
  });
});

function routineSummary(completionPercent: number) {
  return {
    total: 1,
    done: completionPercent ? 1 : 0,
    pending: completionPercent ? 0 : 1,
    skipped: 0,
    missed: 0,
    completionPercent,
  };
}
