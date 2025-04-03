import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTemplateDto: CreateTemplateDto) {
    return this.prisma.mailTemplate.create({
      data: createTemplateDto,
    });
  }

  async findAll() {
    return this.prisma.mailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.mailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('템플릿을 찾을 수 없습니다.');
    }

    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto) {
    const template = await this.findOne(id);

    return this.prisma.mailTemplate.update({
      where: { id },
      data: {
        ...updateTemplateDto,
        version: template.version + 1,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.mailTemplate.delete({
      where: { id },
    });

    return { id };
  }
}
