import { HttpService } from '@nestjs/axios';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Patch,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly httpService: HttpService,
  ) {}

  @Get()
  async UserByAccessToken(@Body() accessToken: string) {
    this.logger.debug('Retrieving user info from Google');
    const userInfoUrl = `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`;
    const response = await this.httpService.get(userInfoUrl).toPromise();
    const userData = response.data;
    return userData.email;
  }

  @Patch('updateNewUser')
  async newUserUpdate(
    @Headers('access_token') accessToken: string,
    @Body() userDto: CreateUserDto,
  ): Promise<any> {
    try {
      this.logger.debug('Processing new user update');
      const email = await this.UserByAccessToken(accessToken);
      const maskedEmail = email
        ? `${email.substring(0, 2)}***@${email.split('@')[1]}`
        : 'unknown';

      const userExists = await this.userService.findOne(email);
      if (userExists) {
        this.logger.debug(`Updating existing user: ${maskedEmail}`);
        return this.userService.newUserUpdate(userExists.email, userDto);
      }
      this.logger.debug(`User not found: ${maskedEmail}`);
      return userExists;
    } catch (error) {
      this.logger.error(`New user update error: ${error.message}`, error.stack);
      return { success: false, error: 'Failed to fetch user data' };
    }
  }

  @Get('/getAllUsers')
  async findAll(@Headers('access_token') accessToken: string): Promise<any> {
    this.logger.debug('Request to get all users');
    try {
      const email = await this.UserByAccessToken(accessToken);
      const user = await this.userService.findOne(email);

      if (user.role !== 'ADMIN') {
        this.logger.warn(
          `Unauthorized access attempt to getAllUsers by non-admin user`,
        );
        return { success: false, error: 'You are not allowed to access' };
      }

      this.logger.debug('Admin requesting all users');
      return this.userService.findAll();
    } catch (error) {
      this.logger.error(`Get all users error: ${error.message}`, error.stack);
      return { success: false, error: 'Failed to fetch user data' };
    }
  }

  @Get('currentUser')
  async findOne(@Headers('access_token') accessToken: string): Promise<any> {
    this.logger.debug('Request to get current user');
    try {
      const email = await this.UserByAccessToken(accessToken);
      const maskedEmail = email
        ? `${email.substring(0, 2)}***@${email.split('@')[1]}`
        : 'unknown';
      this.logger.debug(`Retrieving data for user: ${maskedEmail}`);

      return this.userService.findOne(email);
    } catch (error) {
      this.logger.error(
        `Get current user error: ${error.message}`,
        error.stack,
      );
      return { success: false, error: 'Failed to fetch user data' };
    }
  }

  @Patch('updateUser')
  async update(
    @Headers('access_token') accessToken: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<any> {
    this.logger.debug('Request to update user');
    try {
      const email = await this.UserByAccessToken(accessToken);
      const maskedEmail = email
        ? `${email.substring(0, 2)}***@${email.split('@')[1]}`
        : 'unknown';
      this.logger.debug(`Updating user: ${maskedEmail}`);

      return this.userService.update(email, updateUserDto);
    } catch (error) {
      this.logger.error(`Update user error: ${error.message}`, error.stack);
      return { success: false, error: 'Failed to update user data' };
    }
  }

  @Delete('deleteUser')
  async remove(@Headers('access_token') accessToken: string): Promise<any> {
    this.logger.debug('Request to delete user');
    try {
      const email = await this.UserByAccessToken(accessToken);
      const maskedEmail = email
        ? `${email.substring(0, 2)}***@${email.split('@')[1]}`
        : 'unknown';
      this.logger.debug(`Processing delete request for user: ${maskedEmail}`);

      const user = await this.userService.findOne(email);
      const id = user._id;

      return this.userService.remove(id);
    } catch (error) {
      this.logger.error(`Delete user error: ${error.message}`, error.stack);
      return { success: false, error: 'Failed to delete user data' };
    }
  }
}
