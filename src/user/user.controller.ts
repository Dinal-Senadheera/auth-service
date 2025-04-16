/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { Body, Controller, Delete, Get, Headers, Patch } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly httpService: HttpService,
  ) {}

  // This route is called when the user logs in with Google
  @Get()
  async UserByAccessToken(@Body() accessToken: string) {
    const userInfoUrl = `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`;
    const response = await this.httpService.get(userInfoUrl).toPromise();
    const userData = response.data;
    return userData.email;
  }

  // This route is called when the user logs in with Google for the first time(new user)
  @Patch('updateNewUser')
  async newUserUpdate(
    @Headers('access_token') accessToken: string,
    @Body() userDto: CreateUserDto,
  ): Promise<any> {
    try {
      const email = await this.UserByAccessToken(accessToken);

      const userExists = await this.userService.findOne(email);
      if (userExists) {
        return this.userService.newUserUpdate(userExists.email, userDto);
      }

      return userExists;
    } catch (error) {
      return { success: false, error: 'Failed to fetch user data' };
    }
  }

  // This route is called when admin needs to get all users
  @Get('/getAllUsers')
  async findAll(@Headers('access_token') accessToken: string): Promise<any> {
    const email = await this.UserByAccessToken(accessToken);
    const user = await this.userService.findOne(email);

    if (user.role !== 'ADMIN') {
      return { success: false, error: 'You are not allowed to access' };
    }
    try {
      return this.userService.findAll();
    } catch (error) {
      return { success: false, error: 'Failed to fetch user data' };
    }
  }

  // This route is called when user needs to get his/her details
  @Get('currentUser')
  async findOne(@Headers('access_token') accessToken: string): Promise<any> {
    const email = await this.UserByAccessToken(accessToken);
    try {
      return this.userService.findOne(email);
    } catch (error) {
      return { success: false, error: 'Failed to fetch user data' };
    }
  }

  // This route is called when user needs to update his/her details
  @Patch('updateUser')
  async update(
    @Headers('access_token') accessToken: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<any> {
    const email = await this.UserByAccessToken(accessToken);
    try {
      return this.userService.update(email, updateUserDto);
    } catch (error) {
      return { success: false, error: 'Failed to update user data' };
    }
  }

  // This route is called when user needs to delete his/her account
  @Delete('deleteUser')
  async remove(@Headers('access_token') accessToken: string): Promise<any> {
    const email = await this.UserByAccessToken(accessToken);
    const user = await this.userService.findOne(email);
    const id = user._id;
    try {
      return this.userService.remove(id);
    } catch (error) {
      return { success: false, error: 'Failed to delete user data' };
    }
  }
}