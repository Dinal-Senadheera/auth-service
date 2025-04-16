/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { Controller, Headers, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly httpService: HttpService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  // This route is called when the user logs in with Google
  @Post('login')
  async login(@Headers('access_token') accessToken: string): Promise<any> {
    const userInfoUrl = `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`;

    try {
      const response = await this.httpService.get(userInfoUrl).toPromise();
      const userData = response.data;

      const userExists = await this.userService.findOne(userData.email);
      if (userExists) {
        const payload = {
          sub: userExists.fullName,
          role: userExists.role,
        };
        return {
          success: false,
          token: await this.jwtService.signAsync(payload),
        };
      }
      try {
        const response = await this.userService.create(userData);

        if (response) {
          return { success: true };
        }
      } catch (error) {
        return { success: false, error: 'Failed to create new user' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to fetch user data' };
    }
  }
}