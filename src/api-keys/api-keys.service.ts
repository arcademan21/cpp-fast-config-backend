import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateRawApiKey, getApiKeyPrefix, hashApiKey } from './api-key.util';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getPepper() {
    return this.configService.get<string>('API_KEY_PEPPER', 'dev-pepper');
  }

  async createKey(userId: string) {
    const rawKey = generateRawApiKey();
    const hash = hashApiKey(rawKey, this.getPepper());
    const prefix = getApiKeyPrefix(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        hash,
        prefix,
      },
      select: {
        id: true,
        prefix: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ...apiKey,
      key: rawKey,
    };
  }

  listKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        prefix: true,
        status: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }

  async revokeKey(userId: string, keyId: string) {
    const found = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!found) {
      throw new NotFoundException('API key not found');
    }

    if (found.userId !== userId) {
      throw new ForbiddenException('API key does not belong to user');
    }

    return this.prisma.apiKey.update({
      where: { id: keyId },
      data: { status: ApiKeyStatus.REVOKED },
      select: {
        id: true,
        prefix: true,
        status: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }

  async rotateKey(userId: string, keyId: string) {
    const found = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!found) {
      throw new NotFoundException('API key not found');
    }

    if (found.userId !== userId) {
      throw new ForbiddenException('API key does not belong to user');
    }

    const rawKey = generateRawApiKey();
    const hash = hashApiKey(rawKey, this.getPepper());
    const prefix = getApiKeyPrefix(rawKey);

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.apiKey.update({
        where: { id: keyId },
        data: { status: ApiKeyStatus.REVOKED },
      });

      return tx.apiKey.create({
        data: {
          userId,
          hash,
          prefix,
        },
        select: {
          id: true,
          prefix: true,
          status: true,
          createdAt: true,
          lastUsedAt: true,
        },
      });
    });

    return {
      ...created,
      key: rawKey,
    };
  }

  async softDeleteKey(userId: string, keyId: string) {
    const found = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!found) {
      throw new NotFoundException('API key not found');
    }

    if (found.userId !== userId) {
      throw new ForbiddenException('API key does not belong to user');
    }

    return this.prisma.apiKey.update({
      where: { id: keyId },
      data: { status: ApiKeyStatus.REVOKED },
      select: {
        id: true,
        prefix: true,
        status: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }

  async findActiveByRawKey(rawKey: string) {
    const hash = hashApiKey(rawKey, this.getPepper());
    return this.prisma.apiKey.findUnique({
      where: { hash },
      include: { user: true },
    });
  }

  markKeyUsed(keyId: string) {
    return this.prisma.apiKey.update({
      where: { id: keyId },
      data: { lastUsedAt: new Date() },
    });
  }
}
