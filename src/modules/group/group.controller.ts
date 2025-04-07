import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddRecipientsDto } from './dto/add-recipients.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupService } from './group.service';

@ApiTags('groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @ApiOperation({
    summary: '새 수신자 그룹 생성',
    description: '새로운 수신자 그룹을 생성합니다.',
  })
  @ApiResponse({ status: 201, description: '그룹이 성공적으로 생성됨' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiBody({ type: CreateGroupDto })
  create(@Body() data: CreateGroupDto, @CurrentUser() userId: string) {
    return this.groupService.create({ ...data, userId });
  }

  @Get()
  @ApiOperation({
    summary: '모든 수신자 그룹 조회',
    description: '사용자가 접근 가능한 모든 수신자 그룹을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '그룹 목록 조회 성공' })
  findAll(@CurrentUser() userId: string) {
    return this.groupService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: '특정 수신자 그룹 조회',
    description: '특정 수신자 그룹의 상세 정보를 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '그룹 조회 성공' })
  @ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '그룹 ID' })
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.groupService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOperation({
    summary: '수신자 그룹 정보 수정',
    description: '특정 수신자 그룹의 정보를 수정합니다.',
  })
  @ApiResponse({ status: 200, description: '그룹이 성공적으로 수정됨' })
  @ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '그룹 ID' })
  @ApiBody({ type: UpdateGroupDto })
  update(
    @Param('id') id: string,
    @Body() data: UpdateGroupDto,
    @CurrentUser() userId: string,
  ) {
    return this.groupService.update(id, data, userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '수신자 그룹 삭제',
    description: '특정 수신자 그룹을 삭제합니다.',
  })
  @ApiResponse({ status: 200, description: '그룹이 성공적으로 삭제됨' })
  @ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '그룹 ID' })
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.groupService.remove(id, userId);
  }

  @Post(':id/recipients')
  @ApiOperation({
    summary: '그룹에 수신자 추가',
    description: '특정 그룹에 여러 수신자를 추가합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '수신자가 그룹에 성공적으로 추가됨',
  })
  @ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '그룹 ID' })
  @ApiBody({ type: AddRecipientsDto })
  addRecipients(
    @Param('id') id: string,
    @Body() data: AddRecipientsDto,
    @CurrentUser() userId: string,
  ) {
    return this.groupService.addRecipients(id, data.recipientIds, userId);
  }

  @Delete(':id/recipients')
  @ApiOperation({
    summary: '그룹에서 수신자 제거',
    description: '특정 그룹에서 여러 수신자를 제거합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '수신자가 그룹에서 성공적으로 제거됨',
  })
  @ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '그룹 ID' })
  @ApiBody({ type: AddRecipientsDto })
  removeRecipients(
    @Param('id') id: string,
    @Body() data: AddRecipientsDto,
    @CurrentUser() userId: string,
  ) {
    return this.groupService.removeRecipients(id, data.recipientIds, userId);
  }
}
