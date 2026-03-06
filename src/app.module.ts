import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { DownloadsModule } from './downloads/downloads.module';
import { ArtifactsModule } from './artifacts/artifacts.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ApiKeysModule,
    DownloadsModule,
    ArtifactsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
