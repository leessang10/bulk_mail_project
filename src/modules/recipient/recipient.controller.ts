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
import { RecipientStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateRecipientDto } from './dto/create-recipient.dto';
import { RecipientService } from './recipient.service';

@Controller('api/v1/recipients')
@UseGuards(JwtAuthGuard)
export class RecipientController {
  constructor(private readonly recipientService: RecipientService) {}

  @Post()
  async create(@Body() createRecipientDto: CreateRecipientDto) {
    return this.recipientService.createRecipient(createRecipientDto);
  }

  @Post('batch')
  async createBatch(@Body() createRecipientDtos: CreateRecipientDto[]) {
    return this.recipientService.createRecipients(createRecipientDtos);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('email') email?: string,
    @Query('status') status?: RecipientStatus,
  ) {
    return this.recipientService.findAllRecipients(page, limit, email, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.recipientService.findRecipient(id);
  }

  @Post(':id/unsubscribe')
  async unsubscribe(@Param('id') id: string) {
    return this.recipientService.unsubscribe(id);
  }

  @Post('/groups')
  async createGroup(
    @Body() createGroupDto: CreateGroupDto,
    @CurrentUser() userId: string,
  ) {
    return this.recipientService.createGroup(createGroupDto, userId);
  }

  @Get('/groups')
  async getAllGroups(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.recipientService.getAllGroups(page, limit);
  }

  @Post('/groups/:groupId/recipients')
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
  async getGroupRecipients(
    @Param('groupId') groupId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.recipientService.getGroupRecipients(groupId, page, limit);
  }
}
