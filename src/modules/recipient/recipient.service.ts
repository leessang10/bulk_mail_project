import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Recipient, RecipientStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { UpdateRecipientDto } from './dto/update-recipient.dto';

@Injectable()
export class RecipientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 새 수신자를 생성합니다.
   */
  async createRecipient(
    createRecipientDto: CreateRecipientDto,
  ): Promise<Recipient> {
    // 이미 존재하는 이메일인지 확인
    const existingRecipient = await this.prisma.recipient.findUnique({
      where: { email: createRecipientDto.email },
    });

    if (existingRecipient) {
      throw new BadRequestException(
        `이메일 ${createRecipientDto.email}은(는) 이미 등록되어 있습니다.`,
      );
    }

    return this.prisma.recipient.create({
      data: createRecipientDto,
    });
  }

  /**
   * 여러 수신자를 일괄 등록합니다.
   */
  async createRecipients(
    createRecipientDtos: CreateRecipientDto[],
  ): Promise<{ count: number; errors: any[] }> {
    const errors = [];
    const recipients = [];

    // 중복 제거
    const uniqueEmails = new Set<string>();
    const uniqueDtos = createRecipientDtos.filter((dto) => {
      if (uniqueEmails.has(dto.email)) {
        return false;
      }
      uniqueEmails.add(dto.email);
      return true;
    });

    // 배치 처리 (1000개씩)
    const batchSize = 1000;
    for (let i = 0; i < uniqueDtos.length; i += batchSize) {
      const batch = uniqueDtos.slice(i, i + batchSize);

      try {
        const existingRecipients = await this.prisma.recipient.findMany({
          where: {
            email: {
              in: batch.map((dto) => dto.email),
            },
          },
        });

        const existingEmails = new Set(existingRecipients.map((r) => r.email));
        const newRecipients = batch.filter(
          (dto) => !existingEmails.has(dto.email),
        );

        if (newRecipients.length > 0) {
          await this.prisma.recipient.createMany({
            data: newRecipients,
            skipDuplicates: true,
          });

          recipients.push(...newRecipients);
        }

        batch
          .filter((dto) => existingEmails.has(dto.email))
          .forEach((dto) => {
            errors.push({
              email: dto.email,
              error: '이미 등록된 이메일입니다.',
            });
          });
      } catch (error) {
        console.error('Error in batch creation:', error);
        batch.forEach((dto) => {
          errors.push({
            email: dto.email,
            error: '처리 중 오류가 발생했습니다.',
          });
        });
      }
    }

    return {
      count: recipients.length,
      errors,
    };
  }

  /**
   * 수신자를 조회합니다.
   */
  async findRecipient(id: string): Promise<Recipient> {
    const recipient = await this.prisma.recipient.findUnique({
      where: { id },
    });

    if (!recipient) {
      throw new NotFoundException(`ID ${id}의 수신자를 찾을 수 없습니다.`);
    }

    return recipient;
  }

  /**
   * 모든 수신자를 조회합니다.
   */
  async findAllRecipients(
    page = 1,
    limit = 20,
    email?: string,
    status?: RecipientStatus,
  ): Promise<{ recipients: Recipient[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (email) {
      where.email = { contains: email };
    }
    if (status) {
      where.status = status;
    }

    const [recipients, total] = await Promise.all([
      this.prisma.recipient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recipient.count({ where }),
    ]);

    return { recipients, total };
  }

  /**
   * 수신자 상태를 변경합니다.
   */
  async updateRecipientStatus(
    id: string,
    status: RecipientStatus,
  ): Promise<Recipient> {
    return this.prisma.recipient.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * 이메일을 기준으로 수신자 정보를 조회합니다.
   */
  async findByEmail(email: string): Promise<Recipient | null> {
    return this.prisma.recipient.findUnique({
      where: { email },
    });
  }

  /**
   * 수신 거부 처리
   */
  async unsubscribe(id: string): Promise<Recipient> {
    return this.updateRecipientStatus(id, RecipientStatus.UNSUBSCRIBED);
  }

  /**
   * 새 그룹을 생성합니다.
   */
  async createGroup(groupData: CreateGroupDto, userId: string) {
    return this.prisma.group.create({
      data: {
        ...groupData,
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  /**
   * 그룹에 수신자를 추가합니다.
   */
  async addRecipientsToGroup(groupId: string, recipientIds: string[]) {
    const data = recipientIds.map((recipientId) => ({
      groupId,
      recipientId,
    }));

    await this.prisma.groupRecipient.createMany({
      data,
      skipDuplicates: true,
    });

    return this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        recipients: {
          include: {
            recipient: true,
          },
        },
      },
    });
  }

  /**
   * 그룹의 모든 수신자를 조회합니다.
   */
  async getGroupRecipients(
    groupId: string,
    page = 1,
    limit = 20,
  ): Promise<{ recipients: Recipient[]; total: number }> {
    const skip = (page - 1) * limit;

    const [recipients, total] = await Promise.all([
      this.prisma.recipient.findMany({
        where: {
          groups: {
            some: {
              groupId,
            },
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.recipient.count({
        where: {
          groups: {
            some: {
              groupId,
            },
          },
        },
      }),
    ]);

    return { recipients, total };
  }

  /**
   * 모든 그룹을 조회합니다.
   */
  async getAllGroups(
    page = 1,
    limit = 20,
  ): Promise<{ groups: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
      this.prisma.group.findMany({
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              recipients: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.group.count(),
    ]);

    return {
      groups: groups.map((group) => ({
        ...group,
        recipientCount: group._count.recipients,
        _count: undefined,
      })),
      total,
    };
  }

  async update(id: string, updateRecipientDto: UpdateRecipientDto) {
    return this.prisma.recipient.update({
      where: { id },
      data: updateRecipientDto,
    });
  }

  async remove(id: string) {
    await this.prisma.recipient.delete({
      where: { id },
    });

    return { id };
  }
}
