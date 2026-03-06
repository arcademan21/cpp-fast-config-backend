import { Module } from '@nestjs/common';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';

@Module({
  imports: [PrismaModule, ApiKeysModule, ArtifactsModule],
  controllers: [DownloadsController],
  providers: [DownloadsService],
})
export class DownloadsModule {}
