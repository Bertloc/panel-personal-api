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

  const createTaskService = (initialStatus = 'pending') => {
    let task = {
      id: 'task-id',
      userId: 'user-id',
      projectId: 'project-id',
      title: 'Tarea prueba',
      status: initialStatus,
      priority: 'medium',
      dueDate: null,
      completedAt: null as Date | null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const projectTask = {
      create: jest.fn().mockImplementation(({ data }) => {
        task = { ...task, ...data };
        return Promise.resolve(task);
      }),
      findFirst: jest.fn().mockImplementation(() => Promise.resolve(task)),
      findMany: jest.fn().mockImplementation(() => Promise.resolve([task])),
      update: jest.fn().mockImplementation(({ data }) => {
        task = { ...task, ...data };
        return Promise.resolve(task);
      }),
    };
    const prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-id' }) },
      projectTask,
    } as unknown as PrismaService;

    return new ProjectsService(prisma);
  };

  const createCompletionService = (statuses: string[]) => {
    let project = {
      id: 'project-id',
      userId: 'user-id',
      name: 'Proyecto prueba',
      description: null,
      category: null,
      status: 'active',
      priority: 'medium',
      startDate: null,
      targetDate: null,
      consumesMoney: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tasks = statuses.map((status, index) => ({
      id: `task-${index}`,
      userId: 'user-id',
      projectId: 'project-id',
      title: `Tarea ${index}`,
      description: null,
      status,
      priority: 'medium',
      dueDate: null,
      estimatedCost: null,
      actualCost: null,
      order: index,
      completedAt: status === 'completed' ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const projectUpdate = jest.fn().mockImplementation(({ data }) => {
      project = { ...project, ...data };
      return Promise.resolve(project);
    });
    const prisma = {
      project: {
        findFirst: jest
          .fn()
          .mockImplementation(({ include }) =>
            Promise.resolve(
              include ? { ...project, tasks, budgets: [] } : project,
            ),
          ),
        update: projectUpdate,
      },
      projectTask: {
        findMany: jest
          .fn()
          .mockImplementation(({ where }) =>
            Promise.resolve(
              tasks
                .filter(
                  (task) =>
                    where.status?.not !== 'cancelled' ||
                    task.status !== 'cancelled',
                )
                .map(({ status }) => ({ status })),
            ),
          ),
      },
      $transaction: jest.fn((callback) =>
        callback({ project: { update: projectUpdate } }),
      ),
    } as unknown as PrismaService;

    return { service: new ProjectsService(prisma), projectUpdate };
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

  it('creates tasks as pending and persists every current status transition', async () => {
    const service = createTaskService();

    const created = await service.createTask(
      'project-id',
      { title: 'Tarea prueba' },
      'user-id',
    );
    expect(created).toMatchObject({ status: 'pending', completedAt: null });

    const inProgress = await service.updateTask(
      'task-id',
      { status: 'in_progress' },
      'user-id',
    );
    expect(inProgress).toMatchObject({
      status: 'in_progress',
      completedAt: null,
    });

    const completed = await service.updateTask(
      'task-id',
      { status: 'completed' },
      'user-id',
    );
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeInstanceOf(Date);

    const pending = await service.updateTask(
      'task-id',
      { status: 'pending' },
      'user-id',
    );
    expect(pending).toMatchObject({ status: 'pending', completedAt: null });

    await expect(
      service.updateTask('task-id', { status: 'blocked' }, 'user-id'),
    ).resolves.toMatchObject({ status: 'blocked', completedAt: null });
    await expect(
      service.updateTask('task-id', { status: 'cancelled' }, 'user-id'),
    ).resolves.toMatchObject({ status: 'cancelled', completedAt: null });

    await service.updateTask('task-id', { status: 'in_progress' }, 'user-id');
    const tasks = await service.getTasks('project-id', {}, 'user-id');
    expect(tasks).toEqual([
      expect.objectContaining({ id: 'task-id', status: 'in_progress' }),
    ]);
  });

  it.each([
    ['todo', 'pending'],
    ['done', 'completed'],
  ])(
    'normalizes stored legacy status %s to %s in GET',
    async (stored, current) => {
      const service = createTaskService(stored);

      const tasks = await service.getTasks('project-id', {}, 'user-id');

      expect(tasks[0].status).toBe(current);
    },
  );

  it.each<{ statuses: string[]; expectedMessage: string }>([
    {
      statuses: [],
      expectedMessage:
        'Project must have at least one non-cancelled task to be completed',
    },
    {
      statuses: ['cancelled'],
      expectedMessage:
        'Project must have at least one non-cancelled task to be completed',
    },
    {
      statuses: ['pending'],
      expectedMessage: 'All non-cancelled project tasks must be completed',
    },
    {
      statuses: ['completed', 'pending'],
      expectedMessage: 'All non-cancelled project tasks must be completed',
    },
  ])(
    'rejects project completion for tasks %#',
    async ({ statuses, expectedMessage }) => {
      const { service, projectUpdate } = createCompletionService(statuses);

      await expect(service.complete('project-id', 'user-id')).rejects.toThrow(
        expectedMessage,
      );
      expect(projectUpdate).not.toHaveBeenCalled();
    },
  );

  it.each<{ statuses: string[] }>([
    { statuses: ['completed'] },
    { statuses: ['completed', 'cancelled'] },
  ])('completes a project for tasks %#', async ({ statuses }) => {
    const { service } = createCompletionService(statuses);

    const result = await service.complete('project-id', 'user-id');

    expect(result.status).toBe('completed');
  });

  it('does not let PATCH bypass project completion validation', async () => {
    const { service, projectUpdate } = createCompletionService(['pending']);

    await expect(
      service.update('project-id', { status: 'completed' }, 'user-id'),
    ).rejects.toThrow('All non-cancelled project tasks must be completed');
    expect(projectUpdate).not.toHaveBeenCalled();
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
