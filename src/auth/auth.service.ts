import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { createClerkClient, verifyToken } from '@clerk/backend';
import * as jwt from 'jsonwebtoken';

export interface UserInfo {
  user_id: string;
  name: string;
  surname: string;
  email: string;
  username?: string;
  created_at: string;
  updated_at: string;
}

export interface ValidationResponse {
  status: 'Token Valid' | 'Token Expired' | 'Token Invalid';
  message: string;
  user?: UserInfo;
  timestamp: string;
}

@Injectable()
export class AuthService {
  private readonly clerkSecretKey: string;
  private readonly clerkClient: ReturnType<typeof createClerkClient>;

  constructor() {
    this.clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!this.clerkSecretKey) {
      throw new Error('CLERK_SECRET_KEY environment variable is required');
    }
    
    this.clerkClient = createClerkClient({
      secretKey: this.clerkSecretKey,
    });
  }

  async validateClerkToken(token: string): Promise<ValidationResponse> {
    try {
      if (!token) {
        throw new BadRequestException('Token is required');
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, '');

      // Decode the JWT to get the payload without verification first
      const decodedToken = jwt.decode(cleanToken, { complete: true });
      
      if (!decodedToken) {
        return {
          status: 'Token Invalid',
          message: 'Invalid token format',
          timestamp: new Date().toISOString(),
        };
      }

      // Check if token is expired
      const payload = decodedToken.payload as any;
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < currentTime) {
        return {
          status: 'Token Expired',
          message: 'JWT token has expired',
          timestamp: new Date().toISOString(),
        };
      }

      // Verify the token with Clerk
      const verifiedToken = await verifyToken(cleanToken, {
        secretKey: this.clerkSecretKey,
      });

      if (!verifiedToken || !verifiedToken.sub) {
        return {
          status: 'Token Invalid',
          message: 'Token verification failed',
          timestamp: new Date().toISOString(),
        };
      }

      // Get user information from Clerk
      const user = await this.clerkClient.users.getUser(verifiedToken.sub);

      if (!user) {
        return {
          status: 'Token Invalid',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        };
      }

      // Extract user information
      const userInfo: UserInfo = {
        user_id: user.id,
        name: user.firstName || '',
        surname: user.lastName || '',
        email: user.emailAddresses?.[0]?.emailAddress || '',
        username: user.username || undefined,
        created_at: new Date(user.createdAt).toISOString(),
        updated_at: new Date(user.updatedAt).toISOString(),
      };

      return {
        status: 'Token Valid',
        message: 'Token successfully validated',
        user: userInfo,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      // Handle specific JWT errors
      if (error.name === 'TokenExpiredError') {
        return {
          status: 'Token Expired',
          message: 'JWT token has expired',
          timestamp: new Date().toISOString(),
        };
      }

      if (error.name === 'JsonWebTokenError') {
        return {
          status: 'Token Invalid',
          message: 'Invalid JWT token',
          timestamp: new Date().toISOString(),
        };
      }

      // Handle Clerk-specific errors
      if (error.status === 401 || error.message?.includes('unauthorized')) {
        return {
          status: 'Token Invalid',
          message: 'Unauthorized: Invalid or expired token',
          timestamp: new Date().toISOString(),
        };
      }

      // Log the error for debugging (in production, use proper logging)
      console.error('Token validation error:', error);

      return {
        status: 'Token Invalid',
        message: 'Token validation failed',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
