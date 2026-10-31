import { Module } from '@nestjs/common';
import { ActiveUsageChecker } from './application/active-usage.checker.js';
import { RepositoryActiveUsageChecker } from './application/repository-active-usage.checker.js';
import { UsageRepository } from './domain/usage.repository.js';
import { InMemoryUsageRepository } from './infra/in-memory-usage.repository.js';

@Module({
  providers: [
    { provide: UsageRepository, useClass: InMemoryUsageRepository },
    { provide: ActiveUsageChecker, useClass: RepositoryActiveUsageChecker },
  ],
  exports: [UsageRepository, ActiveUsageChecker],
})
export class UsageCoreModule {}
