import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RecipientStatus } from '@prisma/client';
import * as csv from 'csv-parser';
import * as fs from 'fs';
import * as readline from 'readline';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CsvImportResultDto } from './dto/upload-response.dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * CSV 파일에서 수신자 데이터를 가져와 데이터베이스에 저장합니다.
   */
  async importRecipientsFromCsv(
    file: Express.Multer.File,
  ): Promise<CsvImportResultDto> {
    this.logger.log(`CSV 파일 수신: ${file.originalname}`);

    // 결과 객체 초기화
    const result: CsvImportResultDto = {
      success: true,
      total: 0,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    // CSV 파일 헤더 검증
    const headers = await this.validateCsvHeaders(file.path);
    if (!headers) {
      throw new BadRequestException(
        'CSV 파일의 형식이 올바르지 않습니다. 필수 헤더: email',
      );
    }

    // CSV 파싱 및 데이터베이스 저장
    try {
      // CSV 파일 읽기
      const recipients = await this.parseCsvFile(file.path);

      result.total = recipients.length;

      if (recipients.length === 0) {
        throw new BadRequestException('CSV 파일에 유효한 데이터가 없습니다.');
      }

      // 트랜잭션으로 데이터 처리
      await this.prisma.$transaction(async (tx) => {
        for (const recipientData of recipients) {
          try {
            // 필수 필드 검증
            if (
              !recipientData.email ||
              !this.isValidEmail(recipientData.email)
            ) {
              result.skipped++;
              result.errors.push(
                `이메일 형식이 올바르지 않습니다: ${recipientData.email}`,
              );
              continue;
            }

            // 중복 이메일 확인
            const existingRecipient = await tx.recipient.findUnique({
              where: { email: recipientData.email },
            });

            if (existingRecipient) {
              // 기존 수신자 업데이트
              await tx.recipient.update({
                where: { id: existingRecipient.id },
                data: {
                  name: recipientData.name || existingRecipient.name,
                  status: recipientData.status || existingRecipient.status,
                  customFields: this.getCustomFields(recipientData),
                },
              });

              result.imported++;
            } else {
              // 새 수신자 생성
              await tx.recipient.create({
                data: {
                  email: recipientData.email,
                  name: recipientData.name || null,
                  status:
                    (recipientData.status as RecipientStatus) ||
                    RecipientStatus.ACTIVE,
                  customFields: this.getCustomFields(recipientData),
                },
              });

              result.imported++;
            }
          } catch (error) {
            this.logger.error(
              `수신자 가져오기 오류: ${error.message}`,
              error.stack,
            );
            result.skipped++;
            result.errors.push(`${recipientData.email}: ${error.message}`);
          }
        }
      });

      return result;
    } catch (error) {
      this.logger.error(`CSV 처리 오류: ${error.message}`, error.stack);
      throw new BadRequestException(
        `CSV 파일 처리 중 오류가 발생했습니다: ${error.message}`,
      );
    } finally {
      // 임시 파일 삭제
      this.cleanupFile(file.path);
    }
  }

  /**
   * CSV 파일을 파싱하여 데이터 배열로 변환합니다.
   */
  private async parseCsvFile(filePath: string): Promise<any[]> {
    const results = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * CSV 파일의 헤더를 검증합니다.
   */
  private async validateCsvHeaders(filePath: string): Promise<string[] | null> {
    return new Promise((resolve, reject) => {
      let headers = null;
      let lineCount = 0;

      const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
      const lineReader = readline.createInterface({
        input: readStream,
      });

      lineReader.on('line', (line) => {
        lineCount++;

        if (lineCount === 1) {
          headers = line.split(',').map((header) => header.trim());

          // 필수 헤더 검증
          if (!headers.includes('email')) {
            resolve(null);
          }

          lineReader.close();
          readStream.close();
        }
      });

      lineReader.on('close', () => {
        resolve(headers);
      });

      lineReader.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 이메일 형식을 검증합니다.
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 커스텀 필드를 추출합니다.
   */
  private getCustomFields(data: any): Record<string, any> {
    const customFields = {};
    const reservedFields = ['email', 'name', 'status'];

    for (const key of Object.keys(data)) {
      if (!reservedFields.includes(key)) {
        customFields[key] = data[key];
      }
    }

    return customFields;
  }

  /**
   * 임시 파일을 정리합니다.
   */
  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.logger.error(`파일 정리 오류: ${error.message}`);
    }
  }
}
