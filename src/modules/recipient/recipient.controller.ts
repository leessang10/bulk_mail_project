import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RecipientStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { RecipientService } from './recipient.service';

@ApiTags('recipients')
@Controller('recipients')
@UseGuards(JwtAuthGuard)
export class RecipientController {
  constructor(private readonly recipientService: RecipientService) {}

  @Post()
  @ApiOperation({ summary: '새 수신자 생성' })
  @ApiResponse({ status: 201, description: '수신자가 성공적으로 생성됨' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiBody({ type: CreateRecipientDto })
  async create(@Body() createRecipientDto: CreateRecipientDto) {
    return this.recipientService.createRecipient(createRecipientDto);
  }

  @Post('batch')
  @ApiOperation({ summary: '수신자 일괄 생성' })
  @ApiResponse({ status: 201, description: '수신자들이 성공적으로 생성됨' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiBody({ type: [CreateRecipientDto] })
  async createBatch(@Body() createRecipientDtos: CreateRecipientDto[]) {
    return this.recipientService.createRecipients(createRecipientDtos);
  }

  @Get()
  @ApiOperation({ summary: '수신자 목록 조회' })
  @ApiResponse({ status: 200, description: '수신자 목록 조회 성공' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: RecipientStatus })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('email') email?: string,
    @Query('status') status?: RecipientStatus,
  ) {
    return this.recipientService.findAllRecipients(page, limit, email, status);
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 수신자 조회' })
  @ApiResponse({ status: 200, description: '수신자 조회 성공' })
  @ApiResponse({ status: 404, description: '수신자를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    return this.recipientService.findRecipient(id);
  }

  @Post(':id/unsubscribe')
  @ApiOperation({ summary: '수신 거부 처리' })
  @ApiResponse({ status: 200, description: '수신 거부 처리 성공' })
  @ApiResponse({ status: 404, description: '수신자를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: String })
  async unsubscribe(@Param('id') id: string) {
    return this.recipientService.unsubscribe(id);
  }

  @Post('/groups')
  @ApiOperation({ summary: '새 수신자 그룹 생성' })
  @ApiResponse({ status: 201, description: '그룹이 성공적으로 생성됨' })
  @ApiBody({ type: CreateGroupDto })
  async createGroup(
    @Body() createGroupDto: CreateGroupDto,
    @CurrentUser() userId: string,
  ) {
    return this.recipientService.createGroup(createGroupDto, userId);
  }

  @Get('/groups')
  @ApiOperation({ summary: '모든 수신자 그룹 조회' })
  @ApiResponse({ status: 200, description: '그룹 목록 조회 성공' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllGroups(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.recipientService.getAllGroups(page, limit);
  }

  @Post('/groups/:groupId/recipients')
  @ApiOperation({ summary: '그룹에 수신자 추가' })
  @ApiResponse({ status: 201, description: '수신자가 그룹에 추가됨' })
  @ApiParam({ name: 'groupId', type: String })
  @ApiBody({
    type: Object,
    schema: {
      properties: {
        recipientIds: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async addRecipientsToGroup(
    @Param('groupId') groupId: string,
    @Body() body: { recipientIds: string[] },
  ) {
    return this.recipientService.addRecipientsToGroup(
      groupId,
      body.recipientIds,
    );
  }

  @Get('/groups/:groupId/recipients')
  @ApiOperation({ summary: '그룹의 수신자 목록 조회' })
  @ApiResponse({ status: 200, description: '그룹의 수신자 목록 조회 성공' })
  @ApiParam({ name: 'groupId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getGroupRecipients(
    @Param('groupId') groupId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.recipientService.getGroupRecipients(groupId, page, limit);
  }
}
