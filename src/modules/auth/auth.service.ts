import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { DEFAULT_USER_ID } from '../../common';

export type AuthenticatedUser = {
  userId: string;
  authMode: 'supabase' | 'development-fallback';
};

@Injectable()
export class AuthService {
  authenticate(authorization?: string): AuthenticatedUser {
    if (!authorization) {
      if (process.env.NODE_ENV === 'production') this.unauthorized();
      return {
        userId: DEFAULT_USER_ID,
        authMode: 'development-fallback',
      };
    }

    const [scheme, token, extra] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token || extra) this.unauthorized();
    return { userId: this.verify(token), authMode: 'supabase' };
  }

  private verify(token: string) {
    try {
      const [encodedHeader, encodedPayload, encodedSignature, extra] =
        token.split('.');
      if (!encodedHeader || !encodedPayload || !encodedSignature || extra)
        this.unauthorized();

      const header = JSON.parse(
        Buffer.from(encodedHeader, 'base64url').toString('utf8'),
      ) as { alg?: string };
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as { sub?: string; exp?: number; nbf?: number; iss?: string };
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (header.alg !== 'HS256' || !secret) this.unauthorized();

      const expected = createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest();
      const signature = Buffer.from(encodedSignature, 'base64url');
      if (
        signature.length !== expected.length ||
        !timingSafeEqual(signature, expected)
      )
        this.unauthorized();

      const now = Math.floor(Date.now() / 1000);
      if (
        !payload.sub?.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ) ||
        (payload.exp !== undefined && payload.exp <= now) ||
        (payload.nbf !== undefined && payload.nbf > now)
      )
        this.unauthorized();

      const expectedIssuer = process.env.SUPABASE_URL
        ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`
        : undefined;
      if (expectedIssuer && payload.iss !== expectedIssuer) this.unauthorized();
      return payload.sub;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.unauthorized();
    }
  }

  private unauthorized(): never {
    throw new UnauthorizedException('Unauthorized');
  }
}
