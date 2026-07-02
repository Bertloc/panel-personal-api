import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { DEFAULT_USER_ID } from '../../common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'development' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the demo user only outside production', () => {
    const auth = new AuthService();
    expect(auth.authenticate()).toEqual({
      userId: DEFAULT_USER_ID,
      authMode: 'development-fallback',
    });
    process.env.NODE_ENV = 'production';
    expect(() => auth.authenticate()).toThrow(UnauthorizedException);
  });

  it('rejects an invalid token even in development', () => {
    expect(() => new AuthService().authenticate('Bearer invalid')).toThrow(
      UnauthorizedException,
    );
  });

  it('verifies a Supabase HS256 token', () => {
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_JWT_SECRET = 'test-secret';
    const userId = '123e4567-e89b-42d3-a456-426614174000';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString(
      'base64url',
    );
    const payload = Buffer.from(
      JSON.stringify({
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + 60,
        iss: 'https://project.supabase.co/auth/v1',
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', 'test-secret')
      .update(`${header}.${payload}`)
      .digest('base64url');

    expect(
      new AuthService().authenticate(
        `Bearer ${header}.${payload}.${signature}`,
      ),
    ).toEqual({ userId, authMode: 'supabase' });
  });
});
