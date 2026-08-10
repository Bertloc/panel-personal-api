import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './projects.dto';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const createService = () => {
    const projectCreate = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'project-id',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    const budgetCreate = jest.fn();
    const findFirst = jest.fn().mockImplementation(({ where }) =>
      Promise.resolve({
        id: where.id,
        userId: where.userId,
        name: 'Proyecto prueba',
        description: null,
        category: null,
        status: 'planned',
        priority: 'medium',
        startDate: null,
        targetDate: null,
        consumesMoney: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: [],
        budgets: [],
      }),
    );
    const prisma = {
      $transaction: jest.fn((callback) =>
        callback({
          project: { create: projectCreate },
          projectBudget: { create: budgetCreate },
        }),
      ),
      project: { findFirst },
    } as unknown as PrismaService;

    return {
      service: new ProjectsService(prisma),
      projectCreate,
      budgetCreate,
    };
  };

  it.each([
    {
      name: 'Proyecto prueba',
      priority: 'medium',
      status: 'planned',
      consumesMoney: false,
    },
    { name: 'Proyecto prueba' },
  ])('creates a project without a budget from %#', async (dto) => {
    const { service, projectCreate, budgetCreate } = createService();

    await service.create(dto, 'user-id');

    expect(projectCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Proyecto prueba',
        priority: 'medium',
        status: 'planned',
        consumesMoney: false,
      }),
    });
    expect(budgetCreate).not.toHaveBeenCalled();
  });

  it('does not create a budget when the project does not consume money', async () => {
    const { service, budgetCreate } = createService();

    await service.create(
      { name: 'Proyecto prueba', consumesMoney: false, budgetAmount: 100 },
      'user-id',
    );

    expect(budgetCreate).not.toHaveBeenCalled();
  });

  it('creates a budget when the project consumes money and the amount is valid', async () => {
    const { service, budgetCreate } = createService();

    await service.create(
      { name: 'Proyecto prueba', consumesMoney: true, budgetAmount: 100 },
      'user-id',
    );

    expect(budgetCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        projectId: 'project-id',
        name: 'Project budget',
        plannedAmount: 100,
      },
    });
  });

  it('rejects a null budgetAmount as a bad request', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform(
        { name: 'Proyecto prueba', budgetAmount: null },
        { type: 'body', metatype: CreateProjectDto },
      ),
    ).rejects.toMatchObject({
      response: {
        statusCode: 400,
        message: expect.arrayContaining([
          expect.stringContaining('budgetAmount'),
        ]),
      },
    });
  });

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
    const findMany = jest.fn().mockResolvedValue(projects);
    const prisma = { project: { findMany } } as unknown as PrismaService;

    const result = await new ProjectsService(prisma).summary('user-id');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-id' } }),
    );
    expect(result).toMatchObject({
      active: 1,
      nearCompletion: 0,
      highestProgressProject: { progressPercent: 100 },
      budget: { planned: 100, spent: 35, remaining: 65 },
    });
  });
});
