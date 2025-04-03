import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; userId: string }) {
    return this.prisma.group.create({
      data,
      include: {
        recipients: {
          include: {
            recipient: true,
          },
        },
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.group.findMany({
      where: { userId },
      include: {
        recipients: {
          include: {
            recipient: true,
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.group.findFirst({
      where: { id, userId },
      include: {
        recipients: {
          include: {
            recipient: true,
          },
        },
      },
    });
  }

  async update(id: string, data: { name: string }, userId: string) {
    return this.prisma.group.update({
      where: { id_userId: { id, userId } },
      data,
      include: {
        recipients: {
          include: {
            recipient: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.prisma.groupRecipient.deleteMany({
      where: { groupId: id },
    });

    return this.prisma.group.delete({
      where: { id_userId: { id, userId } },
    });
  }

  async addRecipients(id: string, recipientIds: string[], userId: string) {
    const group = await this.findOne(id, userId);
    if (!group) {
      throw new Error('그룹을 찾을 수 없습니다.');
    }

    const data = recipientIds.map((recipientId) => ({
      groupId: id,
      recipientId,
    }));

    await this.prisma.groupRecipient.createMany({
      data,
      skipDuplicates: true,
    });

    return this.findOne(id, userId);
  }

  async removeRecipients(id: string, recipientIds: string[], userId: string) {
    const group = await this.findOne(id, userId);
    if (!group) {
      throw new Error('그룹을 찾을 수 없습니다.');
    }

    await this.prisma.groupRecipient.deleteMany({
      where: {
        groupId: id,
        recipientId: {
          in: recipientIds,
        },
      },
    });

    return this.findOne(id, userId);
  }
}
