# Bulk Mail Project

대량 메일 발송을 위한 NestJS 기반 백엔드 서비스입니다.

## 주요 기능

### 1. 인증 및 권한 관리

- JWT 기반 사용자 인증
- 역할 기반 접근 제어 (ADMIN/USER)
- 사용자 관리 (생성, 수정, 삭제)

### 2. 메일 템플릿 관리

- MJML 기반 반응형 이메일 템플릿
- 템플릿 버전 관리 및 이력 추적
- 머지 태그를 통한 개인화
- 템플릿 미리보기 및 테스트
- 템플릿 복제 및 공유

### 3. 수신자 관리

- CSV 파일을 통한 대량 수신자 등록
- 수신자 그룹 관리
- 수신 거부 처리
- 이메일 검증 및 중복 체크

### 4. 캠페인 관리

- 캠페인 CRUD
- 예약 발송
- 발송 상태 추적
- A/B 테스트

### 5. 메일 발송

- AWS SES 통합
- 대량 메일 발송 최적화
- 발송 실패 자동 재시도
- 바운스/컴플레인 처리

### 6. 분석 및 통계

- 발송 통계
- 열람률/클릭률 추적
- 바운스/컴플레인 분석

## 시작하기

### 필수 요구사항

- Node.js 18 이상
- PostgreSQL 13 이상
- Redis
- Apache Kafka
- AWS SES 계정

### 환경 설정

1. 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 필수 환경 변수
DATABASE_URL="postgresql://user:password@localhost:5432/bulk_mail"
REDIS_URL="redis://localhost:6379"
KAFKA_BROKERS="localhost:9092"
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
AWS_REGION="ap-northeast-2"
JWT_SECRET="your_jwt_secret"
```

2. 데이터베이스 마이그레이션

```bash
# Prisma 마이그레이션
npx prisma migrate dev
```

3. 의존성 설치

```bash
npm install
```

### 실행 방법

```bash
# 개발 모드
npm run start:dev

# 프로덕션 모드
npm run build
npm run start:prod
```

## API 엔드포인트

### 인증

- POST /api/auth/login - 로그인
- POST /api/auth/register - 회원가입

### 템플릿

- POST /api/templates - 템플릿 생성
- GET /api/templates - 템플릿 목록 조회
- GET /api/templates/:id - 템플릿 상세 조회
- PATCH /api/templates/:id - 템플릿 수정
- DELETE /api/templates/:id - 템플릿 삭제
- POST /api/templates/:id/preview - 템플릿 미리보기
- POST /api/templates/:id/clone - 템플릿 복제
- GET /api/templates/:id/versions - 버전 이력 조회
- GET /api/templates/:id/versions/:version - 특정 버전 조회
- POST /api/templates/:id/versions/:version/restore - 버전 복원
- GET /api/templates/:id/versions/compare - 버전 비교

### 수신자

- POST /api/recipients - 수신자 생성
- POST /api/recipients/bulk - CSV 파일로 대량 등록
- GET /api/recipients - 수신자 목록 조회
- GET /api/recipients/:id - 수신자 상세 조회
- PATCH /api/recipients/:id - 수신자 정보 수정
- DELETE /api/recipients/:id - 수신자 삭제

### 그룹

- POST /api/groups - 그룹 생성
- GET /api/groups - 그룹 목록 조회
- GET /api/groups/:id - 그룹 상세 조회
- PATCH /api/groups/:id - 그룹 수정
- DELETE /api/groups/:id - 그룹 삭제
- POST /api/groups/:id/recipients - 수신자 추가
- DELETE /api/groups/:id/recipients/:recipientId - 수신자 제거

### 캠페인

- POST /api/campaigns - 캠페인 생성
- GET /api/campaigns - 캠페인 목록 조회
- GET /api/campaigns/:id - 캠페인 상세 조회
- PATCH /api/campaigns/:id - 캠페인 수정
- DELETE /api/campaigns/:id - 캠페인 삭제
- POST /api/campaigns/:id/send - 캠페인 발송
- POST /api/campaigns/:id/schedule - 캠페인 예약
- POST /api/campaigns/:id/cancel - 캠페인 취소

### 분석

- GET /api/analytics/campaigns/:id - 캠페인 분석
- GET /api/analytics/campaigns/:id/hourly - 시간별 분석
- GET /api/analytics/campaigns/:id/recipients - 수신자별 분석

## 데이터베이스 스키마

### 주요 모델

- User: 사용자 정보
- MailTemplate: 메일 템플릿
- MailTemplateVersion: 템플릿 버전
- Campaign: 메일 캠페인
- Recipient: 수신자
- Group: 수신자 그룹
- MailEvent: 메일 이벤트 (발송, 열람, 클릭 등)

## 아키텍처

### 인프라 구성

- NestJS: 백엔드 프레임워크
- PostgreSQL: 주 데이터베이스
- Redis: 캐싱 및 큐
- Kafka: 이벤트 스트리밍
- AWS SES: 메일 발송

### 디렉토리 구조

```
src/
├── config/           # 환경 설정
├── modules/          # 기능별 모듈
│   ├── auth/        # 인증 모듈
│   ├── campaign/    # 캠페인 모듈
│   ├── template/    # 템플릿 모듈
│   ├── recipient/   # 수신자 모듈
│   ├── group/       # 그룹 모듈
│   ├── mail/        # 메일 발송 모듈
│   └── analytics/   # 분석 모듈
├── common/          # 공통 유틸리티
└── infrastructure/  # 인프라 설정
```

## 보안

### 인증

- JWT 기반 인증
- 역할 기반 접근 제어
- API 키 관리

### 데이터 보안

- 비밀번호 해싱
- 민감 정보 암호화
- HTTPS 통신

## 모니터링

### 로깅

- Winston 로거 사용
- 구조화된 로그 포맷
- 로그 레벨 구분

### 메트릭

- 메일 발송 성공/실패율
- API 응답 시간
- 시스템 리소스 사용량

## 배포

### Docker

```bash
# 이미지 빌드
docker build -t bulk-mail-project .

# 컨테이너 실행
docker-compose up -d
```

### 환경별 설정

- development: 개발 환경
- staging: 스테이징 환경
- production: 프로덕션 환경

## 문제 해결

### 일반적인 문제

1. 데이터베이스 연결 오류

   - 환경 변수 확인
   - PostgreSQL 서비스 상태 확인

2. Redis 연결 오류

   - Redis 서버 실행 여부 확인
   - 포트 및 인증 설정 확인

3. Kafka 연결 오류
   - Kafka 브로커 상태 확인
   - 토픽 생성 여부 확인

### 메일 발송 문제

1. AWS SES 설정

   - API 키 확인
   - 발신자 이메일 인증 상태 확인

2. 대량 발송 최적화
   - 배치 크기 조정
   - 발송 간격 설정

## 라이선스

MIT License
