import { PrismaService } from '../../prisma/prisma.service';
import { RoutinesService } from './routines.service';

describe('RoutinesService', () => {
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

    const result = await new RoutinesService(prisma).getToday({
      date: '2026-07-15',
    });

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
});
