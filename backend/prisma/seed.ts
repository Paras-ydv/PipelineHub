import { PrismaClient, UserRole, RepoLanguage, WorkerStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seed() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pipelinehub.dev' },
    update: {},
    create: { email: 'admin@pipelinehub.dev', username: 'admin', passwordHash, role: UserRole.ADMIN },
  });

  for (const w of [
    { name: 'worker-python', language: RepoLanguage.PYTHON },
    { name: 'worker-node', language: RepoLanguage.NODE },
    { name: 'worker-java', language: RepoLanguage.JAVA },
    { name: 'worker-general', language: RepoLanguage.GENERAL },
  ]) {
    await prisma.worker.upsert({ where: { name: w.name }, update: {}, create: { ...w, status: WorkerStatus.IDLE } });
  }

  await prisma.pipeline.upsert({
    where: { id: 'default-pipeline' },
    update: {},
    create: {
      id: 'default-pipeline',
      name: 'Default Pipeline',
      isDefault: true,
      stages: ['checkout', 'install', 'build', 'test', 'security_scan', 'package', 'deploy', 'notify'],
    },
  });

  for (const r of [
    { name: 'api-service', owner: 'demo-org', language: RepoLanguage.NODE, branch: 'main' },
    { name: 'ml-pipeline', owner: 'demo-org', language: RepoLanguage.PYTHON, branch: 'main' },
    { name: 'spring-backend', owner: 'demo-org', language: RepoLanguage.JAVA, branch: 'develop' },
  ]) {
    const fullName = `${r.owner}/${r.name}`;
    await prisma.repository.upsert({
      where: { fullName },
      update: {},
      create: {
        ...r, fullName, userId: admin.id,
        webhookSecret: `secret-${Math.random().toString(36).slice(2)}`,
        autoDemo: true,
        eventTypes: ['push', 'pull_request'],
        pipelineConfig: { stages: ['checkout', 'install', 'build', 'test', 'deploy'] },
      },
    });
  }

  console.log('✅ Seed complete');
  await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
