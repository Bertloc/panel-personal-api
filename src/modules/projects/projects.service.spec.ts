import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  it('calculates progress without cancelled tasks and summarizes costs', async () => {
    const projects = [
      {
        id: 'project-id',
        userId: 'user-id',
        name: 'Panel Personal',
        description: null,
        category: 'learning',
        status: 'active',
        priority: 'high',
        startDate: null,
        targetDate: null,
        consumesMoney: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: [
          {
            id: 'done-id',
            title: 'Done',
            status: 'completed',
            priority: 'high',
            dueDate: null,
            actualCost: 25,
            order: 1,
          },
          {
            id: 'cancelled-id',
            title: 'Cancelled',
            status: 'cancelled',
            priority: 'low',
            dueDate: null,
            actualCost: 100,
            order: 2,
          },
        ],
        budgets: [{ plannedAmount: 100, spentAmount: 10 }],
      },
    ];
    const prisma = {
      project: { findMany: jest.fn().mockResolvedValue(projects) },
    } as unknown as PrismaService;

    const result = await new ProjectsService(prisma).summary();

    expect(result).toMatchObject({
      active: 1,
      nearCompletion: 0,
      highestProgressProject: { progressPercent: 100 },
      budget: { planned: 100, spent: 35, remaining: 65 },
    });
  });
});
