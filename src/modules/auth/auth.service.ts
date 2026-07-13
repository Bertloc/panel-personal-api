import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { DEFAULT_USER_ID } from '../../common';

export type AuthenticatedUser = {
  userId: string;
  authMode: 'supabase' | 'development-fallback';
};

type JwtHeader = {
  alg?: string;
  kid?: string;
};

type LegacyPayload = {
  sub?: string;
  exp?: number;
  nbf?: number;
  iss?: string;
  aud?: string;
};

@Injectable()
export class AuthService {
  private readonly supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  private readonly jwks =
    this.supabaseUrl !== undefined
      ? createRemoteJWKSet(
          new URL(`${this.supabaseUrl}/auth/v1/.well-known/jwks.json`),
        )
      : null;

  async authenticate(authorization?: string): Promise<AuthenticatedUser> {
    if (!authorization) {
      if (process.env.NODE_ENV === 'production') this.unauthorized();

      return {
        userId: DEFAULT_USER_ID,
        authMode: 'development-fallback',
      };
    }

    const [scheme, token, extra] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token || extra) {
      this.unauthorized();
    }

    return {
      userId: await this.verify(token),
      authMode: 'supabase',
    };
  }

  private async verify(token: string): Promise<string> {
    const header = this.decodeHeader(token);

    if (header.alg === 'ES256') {
      return this.verifyWithJwks(token);
    }

    if (header.alg === 'HS256') {
      return this.verifyLegacyHs256(token);
    }

    this.unauthorized();
  }

  private decodeHeader(token: string): JwtHeader {
    try {
      const [encodedHeader] = token.split('.');

      if (!encodedHeader) {
        this.unauthorized();
      }

      return JSON.parse(
        Buffer.from(encodedHeader, 'base64url').toString('utf8'),
      ) as JwtHeader;
    } catch {
      this.unauthorized();
    }
  }

  private async verifyWithJwks(token: string): Promise<string> {
    try {
      if (!this.supabaseUrl || !this.jwks) {
        this.unauthorized();
      }

      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `${this.supabaseUrl}/auth/v1`,
        audience: 'authenticated',
      });

      const userId = payload.sub;

      if (!this.isUuid(userId)) {
        this.unauthorized();
      }

      return userId;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.unauthorized();
    }
  }

  private verifyLegacyHs256(token: string): string {
    try {
      const [encodedHeader, encodedPayload, encodedSignature, extra] =
        token.split('.');

      if (!encodedHeader || !encodedPayload || !encodedSignature || extra) {
        this.unauthorized();
      }

      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as LegacyPayload;

      const secret = process.env.SUPABASE_JWT_SECRET;

      if (!secret) {
        this.unauthorized();
      }

      const expected = createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest();

      const signature = Buffer.from(encodedSignature, 'base64url');

      if (
        signature.length !== expected.length ||
        !timingSafeEqual(signature, expected)
      ) {
        this.unauthorized();
      }

      const now = Math.floor(Date.now() / 1000);

      if (
        !this.isUuid(payload.sub) ||
        (payload.exp !== undefined && payload.exp <= now) ||
        (payload.nbf !== undefined && payload.nbf > now)
      ) {
        this.unauthorized();
      }

      const expectedIssuer = this.supabaseUrl
        ? `${this.supabaseUrl}/auth/v1`
        : undefined;

      if (expectedIssuer && payload.iss !== expectedIssuer) {
        this.unauthorized();
      }

      return payload.sub;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.unauthorized();
    }
  }

  private isUuid(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    );
  }

  private unauthorized(): never {
    throw new UnauthorizedException('Unauthorized');
  }
}