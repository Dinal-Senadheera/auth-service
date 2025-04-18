import { HttpService } from '@nestjs/axios';
import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
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

      // Add detailed logging for debugging
      console.log('Google OAuth Debug:', {
        API_BASE_URL: process.env.API_BASE_URL,
        fullRedirectUri: `${process.env.API_BASE_URL}/api/auth/google/callback`,
        encodedRedirectUri: redirectUri,
        clientId: clientId?.substring(0, 8) + '...', // Log partial ID for security
      });

      // Build the Google OAuth URL
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

      console.log('Google Auth URL:', googleAuthUrl);
      // Still perform the redirect, but with more control
      return res.redirect(302, googleAuthUrl);
    } catch (error) {
      console.error('Error in Google Auth:', error);
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
      console.log('Google callback code:', code);
      // Exchange authorization code for tokens
      const tokenResponse = await this.httpService
        .post('https://oauth2.googleapis.com/token', {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri: `${process.env.API_BASE_URL}/api/auth/google/callback`,
          grant_type: 'authorization_code',
        })
        .toPromise();

      const { access_token } = tokenResponse.data;

      // Use the access token to get user info
      const userInfoResponse = await this.httpService
        .get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        })
        .toPromise();

      const userData = userInfoResponse.data;
      let user = await this.userService.findOne(userData.email);

      if (!user) {
        user = await this.userService.create(userData);
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
      console.log('Setting cookie:', cookieOptions);

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        note: 'You can now access protected resources.',
        token,
      });
    } catch (error) {
      console.error('Error in Google callback:', error);
      return res
        .status(500)
        .json({ success: false, error: 'Authentication failed' });
    }
  }

  @Get('success')
  successPage(@Req() req) {
    console.log('Cookies:', req.cookies);
    console.log('Request Headers:', req.headers);

    return {
      success: true,
      message: 'You have successfully authenticated with Google!',
      note: 'Your authentication token has been stored as a cookie. You can now access protected resources.',
      suggestedEndpoints: [
        { name: 'Check Auth Status', url: '/api/auth/status' },
        { name: 'View Courses', url: '/api/courses' },
      ],
    };
  }
}
