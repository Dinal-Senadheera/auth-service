import { HttpService } from '@nestjs/axios';
import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly userService: UserService,
  ) {}

  // Step 1: Redirect user to Google login
  @Get('google')
  async googleAuth(@Res() res) {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = encodeURIComponent(
        `${process.env.API_BASE_URL}/api/auth/google/callback`,
      );
      const scope = encodeURIComponent('profile email');

      this.logger.debug('Initiating Google OAuth flow');

      // Build the Google OAuth URL
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

      this.logger.debug('Redirecting to Google Auth URL');
      return res.redirect(302, googleAuthUrl);
    } catch (error) {
      this.logger.error(`Error in Google Auth: ${error.message}`, error.stack);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate Google authentication URL',
        error: error.message,
      });
    }
  }

  // Step 2: Handle the callback from Google
  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res) {
    try {
      this.logger.debug('Received Google callback with authorization code');

      const tokenResponse = await this.httpService
        .post('https://oauth2.googleapis.com/token', {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri: `${process.env.API_BASE_URL}/api/auth/google/callback`,
          grant_type: 'authorization_code',
        })
        .toPromise();

      this.logger.debug('Successfully exchanged authorization code for token');
      const { access_token } = tokenResponse.data;

      const userInfoResponse = await this.httpService
        .get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        })
        .toPromise();

      const userData = userInfoResponse.data;

      const maskedEmail = userData.email
        ? `${userData.email.substring(0, 2)}***@${userData.email.split('@')[1]}`
        : 'unknown';

      this.logger.debug(`Retrieved Google user data for: ${maskedEmail}`);

      let user = await this.userService.findOne(userData.email);

      if (!user) {
        this.logger.debug(`Creating new user account`);
        user = await this.userService.create(userData);
      } else {
        this.logger.debug(`Found existing user account`);
      }

      const payload = {
        sub: user.fullName,
        email: userData.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours expiration
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET);

      const domainName = new URL(process.env.API_BASE_URL).hostname;
      const cookieOptions = {
        httpOnly: true,
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        domain: domainName,
      };

      res.cookie('auth_token', token, cookieOptions);
      this.logger.debug('Authentication cookie set successfully');

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        note: 'You can now access protected resources.',
        token,
      });
    } catch (error) {
      this.logger.error(
        `Error in Google callback: ${error.message}`,
        error.stack,
      );
      return res
        .status(500)
        .json({ success: false, error: 'Authentication failed' });
    }
  }
}
