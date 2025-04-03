import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 사용자 회원가입
   */
  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // 이메일 중복 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('이미 등록된 이메일입니다.');
    }

    // 비밀번호 해싱
    const hashedPassword = await this.hashPassword(password);

    // 첫 번째 사용자는 관리자로 설정
    const userCount = await this.prisma.user.count();
    const role = userCount === 0 ? UserRole.ADMIN : UserRole.USER;

    // 사용자 생성
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // JWT 토큰 생성
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user,
      token,
    };
  }

  /**
   * 사용자 로그인
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 이메일로 사용자 조회
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // 사용자가 없거나 비밀번호가 일치하지 않으면 에러
    if (!user || !(await this.validatePassword(password, user.password))) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 마지막 로그인 시간 업데이트
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 민감한 정보 제외
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    // JWT 토큰 생성
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * 비밀번호 해싱
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * 비밀번호 검증
   */
  private async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * JWT 토큰 생성
   */
  private generateToken(userId: string, email: string, role: UserRole): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    return this.jwtService.sign(payload);
  }
}
