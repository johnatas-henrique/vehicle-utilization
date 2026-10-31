import { Module } from '@nestjs/common';
import { ActiveUsageChecker } from './application/active-usage.checker.js';
import { RepositoryActiveUsageChecker } from './application/repository-active-usage.checker.js';
import { UsageRepository } from './domain/usage.repository.js';
import { InMemoryUsageRepository } from './infra/in-memory-usage.repository.js';

// Usages need vehicles and drivers, while both of them need the active usage guard.
// Keeping this module free of imports breaks that cycle without forwardRef: the
// checker and the repository are provided once here and shared by every importer.
@Module({
  providers: [
    { provide: UsageRepository, useClass: InMemoryUsageRepository },
    { provide: ActiveUsageChecker, useClass: RepositoryActiveUsageChecker },
  ],
  exports: [UsageRepository, ActiveUsageChecker],
})
export class UsageCoreModule {}
