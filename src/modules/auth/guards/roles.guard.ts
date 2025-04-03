import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 역할 메타데이터 가져오기
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 메타데이터가 없으면 모든 사용자 접근 허용
    if (!requiredRoles) {
      return true;
    }

    // 요청에서 사용자 정보 가져오기
    const { user } = context.switchToHttp().getRequest();

    // 사용자 정보가 없으면 접근 거부
    if (!user) {
      return false;
    }

    // 사용자 역할이 필요한 역할 중 하나와 일치하는지 확인
    return requiredRoles.some((role) => user?.role === role);
  }
}
