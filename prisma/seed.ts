import { DEFAULT_USER_ID } from '../src/common';
import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaService();

async function seed() {
  await prisma.profile.upsert({
    where: { userId: DEFAULT_USER_ID },
    create: { userId: DEFAULT_USER_ID, displayName: 'Personal Profile' },
    update: {},
  });
  await prisma.appSettings.upsert({
    where: { userId: DEFAULT_USER_ID },
    create: { userId: DEFAULT_USER_ID, currency: 'MXN', incomeFrequency: 'biweekly', defaultFoodBudget: 700, dailyTransportEstimate: 20, debtPaymentDay: 15, gymPaymentDay: 19 },
    update: {},
  });
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
