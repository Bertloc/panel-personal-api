import { DEFAULT_USER_ID } from '../src/common';
import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaService();

async function seed() {
  await prisma.profile.upsert({
    where: { userId: DEFAULT_USER_ID },
    create: {
      userId: DEFAULT_USER_ID,
      displayName: 'Personal Profile',
      currency: 'MXN',
    },
    update: {},
  });
  await prisma.appSettings.upsert({
    where: { userId: DEFAULT_USER_ID },
    create: {
      userId: DEFAULT_USER_ID,
      currency: 'MXN',
      incomeFrequency: 'biweekly',
      budgetMode: 'adjusted',
      defaultFoodBudget: 700,
      dailyTransportEstimate: 20,
      debtPaymentDay: 15,
      gymPaymentDay: 19,
    },
    update: {},
  });
  await prisma.incomeSource.upsert({
    where: {
      userId_name: {
        userId: DEFAULT_USER_ID,
        name: 'Ingreso principal',
      },
    },
    create: {
      userId: DEFAULT_USER_ID,
      name: 'Ingreso principal',
      amount: 4730,
      frequency: 'biweekly',
    },
    update: {},
  });
  if (!(await prisma.routine.count({ where: { userId: DEFAULT_USER_ID } }))) {
    const routines = [
      {
        name: 'Rutina entre semana',
        days: [1, 2, 3, 4, 5],
        items: ['Gym', 'Estudiar', 'Comer bien'],
      },
      {
        name: 'Rutina domingo',
        days: [0],
        items: ['Planear semana', 'Revisar dinero'],
      },
    ];
    await prisma.$transaction(async (tx) => {
      for (const definition of routines) {
        const routine = await tx.routine.create({
          data: {
            userId: DEFAULT_USER_ID,
            name: definition.name,
            status: 'active',
          },
        });
        await tx.routineSchedule.createMany({
          data: definition.days.map((dayOfWeek) => ({
            userId: DEFAULT_USER_ID,
            routineId: routine.id,
            dayOfWeek,
          })),
        });
        await tx.routineItem.createMany({
          data: definition.items.map((title, index) => ({
            userId: DEFAULT_USER_ID,
            routineId: routine.id,
            title,
            order: index + 1,
          })),
        });
      }
    });
  }
  const financialDataCount = await Promise.all([
    prisma.expenseCategory.count({ where: { userId: DEFAULT_USER_ID } }),
    prisma.debt.count({ where: { userId: DEFAULT_USER_ID } }),
    prisma.recurringObligation.count({ where: { userId: DEFAULT_USER_ID } }),
    prisma.expense.count({ where: { userId: DEFAULT_USER_ID } }),
  ]);
  if (financialDataCount.some(Boolean)) return;

  const definitions = [
    ['Comida', 'comida', 'expense', false],
    ['Transporte', 'transporte', 'expense', false],
    ['Gym', 'gym', 'expense', true],
    ['Nutriólogo', 'nutriologo', 'expense', false],
    ['Ocio', 'ocio', 'expense', false],
    ['Ahorro', 'ahorro', 'saving', false],
    ['Deuda', 'deuda', 'debt', true],
    ['Imprevistos', 'imprevistos', 'expense', false],
  ] as const;
  const categories = new Map<string, string>();
  for (const [name, slug, type, isFixed] of definitions) {
    const category = await prisma.expenseCategory.upsert({
      where: { userId_slug: { userId: DEFAULT_USER_ID, slug } },
      create: { userId: DEFAULT_USER_ID, name, slug, type, isFixed },
      update: {},
    });
    categories.set(slug, category.id);
  }
  if (!(await prisma.debt.findFirst({ where: { userId: DEFAULT_USER_ID, name: 'Deuda bancaria' } }))) {
    await prisma.debt.create({ data: { userId: DEFAULT_USER_ID, name: 'Deuda bancaria', initialAmount: 10015, currentAmount: 10015, minimumPayment: 2372.85, paymentDay: 15, status: 'active' } });
  }
  const obligations = [
    { name: 'Gym', amount: 450, frequency: 'monthly', dueDay: 19, categoryId: categories.get('gym') },
    { name: 'Deuda', amount: 2372.85, frequency: 'monthly', dueDay: 15, categoryId: categories.get('deuda') },
    { name: 'Transporte', amount: 20, frequency: 'daily', categoryId: categories.get('transporte') },
    { name: 'Nutriólogo', amount: 490, frequency: 'custom', categoryId: categories.get('nutriologo') },
  ];
  for (const obligation of obligations) {
    const existing = await prisma.recurringObligation.findFirst({ where: { userId: DEFAULT_USER_ID, name: obligation.name } });
    if (!existing) await prisma.recurringObligation.create({ data: { ...obligation, userId: DEFAULT_USER_ID, isRequired: true } });
  }
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
