import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, callback) => {
      // 파일 이름 설정: 타임스탬프 + UUID + 원본 확장자
      const uniqueFileName = `${Date.now()}-${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueFileName);
    },
  }),
  fileFilter: (req, file, callback) => {
    // 허용되는 파일 타입 설정
    if (file.mimetype.match(/\/(csv|plain|vnd.ms-excel|octet-stream)$/)) {
      callback(null, true);
    } else {
      callback(new Error('지원되지 않는 파일 형식입니다.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
};
