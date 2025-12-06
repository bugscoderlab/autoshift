import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

// Core modules
import { DatabaseModule } from './core/database/database.module';
import { ConfigurationModule } from './core/config/config.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { RosterModule } from './modules/roster/roster.module';
import { LeaveModule } from './modules/leave/leave.module';
import { SwapModule } from './modules/swap/swap.module';
import { WorkloadModule } from './modules/workload/workload.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AIModule } from './modules/ai/ai.module';
import { UpskillModule } from './modules/upskill/upskill.module';

// Guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ConfigurationModule,
    DatabaseModule,

    // Feature modules
    AuthModule,
    EmployeesModule,
    ShiftsModule,
    RosterModule,
    LeaveModule,
    SwapModule,
    WorkloadModule,
    ReportsModule,
    NotificationsModule,
    AIModule,
    UpskillModule,
  ],
  providers: [
    // Global JWT guard (routes need @Public() to be accessible without auth)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

