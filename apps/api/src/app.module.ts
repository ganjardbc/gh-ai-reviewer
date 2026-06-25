import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database';
import { AuthModule } from './auth/auth.module';
import { MerchantsModule } from './merchants/merchants.module';
import { UsersModule } from './users/users.module';
import { RbacModule } from './rbac/rbac.module';
import { SettingsModule } from './settings/settings.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiReviewModule } from './ai-review/ai-review.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    MerchantsModule,
    UsersModule,
    RbacModule,
    SettingsModule,
    UploadsModule,
    NotificationsModule,
    AiReviewModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply JwtAuthGuard globally to all routes
    // Can be bypassed with @Public() decorator
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
