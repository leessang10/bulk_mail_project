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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddRecipientsDto } from './dto/add-recipients.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupService } from './group.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  create(@Body() data: CreateGroupDto, @CurrentUser() userId: string) {
    return this.groupService.create({ ...data, userId });
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.groupService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.groupService.findOne(id, userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: UpdateGroupDto,
    @CurrentUser() userId: string,
  ) {
    return this.groupService.update(id, data, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.groupService.remove(id, userId);
  }

  @Post(':id/recipients')
  addRecipients(
    @Param('id') id: string,
    @Body() data: AddRecipientsDto,
    @CurrentUser() userId: string,
  ) {
    return this.groupService.addRecipients(id, data.recipientIds, userId);
  }

  @Delete(':id/recipients')
  removeRecipients(
    @Param('id') id: string,
    @Body() data: AddRecipientsDto,
    @CurrentUser() userId: string,
  ) {
    return this.groupService.removeRecipients(id, data.recipientIds, userId);
  }
}
