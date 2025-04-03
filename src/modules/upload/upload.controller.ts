import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { multerConfig } from '../../common/config/multer.config';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * CSV 파일을 업로드하여 수신자를 일괄 등록합니다.
   */
  @Post('recipients/csv')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadRecipientsCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 제공되지 않았습니다.');
    }

    // 파일 확장자 확인
    const fileExt = file.originalname.split('.').pop().toLowerCase();
    if (fileExt !== 'csv') {
      throw new BadRequestException('CSV 파일만 허용됩니다.');
    }

    return this.uploadService.importRecipientsFromCsv(file);
  }
}
