/**
 * HTTP Basic Auth Provider for TinaCMS
 *
 * Simple authentication using HTTP Basic Auth.
 * Credentials are validated against environment variables.
 *
 * Set these environment variables:
 * - TINA_ADMIN_USERNAME (default: admin)
 * - TINA_ADMIN_PASSWORD (required in production)
 */

import type { BackendAuthProvider } from "@tinacms/datalayer";

export interface BasicAuthConfig {
  username?: string;
  password?: string;
}

/**
 * Backend Auth Provider for HTTP Basic Auth
 * Validates the Authorization header against configured credentials
 */
export class BasicAuthBackendProvider implements BackendAuthProvider {
  private username: string;
  private password: string;

  constructor(config?: BasicAuthConfig) {
    this.username = config?.username || process.env.TINA_ADMIN_USERNAME || 'admin';
    this.password = config?.password || process.env.TINA_ADMIN_PASSWORD || '';

    if (!this.password && process.env.NODE_ENV === 'production') {
      console.warn('WARNING: TINA_ADMIN_PASSWORD not set in production!');
    }
  }

  /**
   * Validates the Authorization header
   * Expected format: "Basic base64(username:password)"
   */
  async isAuthorized(req: any): Promise<boolean> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    try {
      const base64Credentials = authHeader.slice(6); // Remove 'Basic '
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');

      return username === this.username && password === this.password;
    } catch (error) {
      console.error('Basic auth validation error:', error);
      return false;
    }
  }
}

/**
 * Factory function to create BasicAuth backend provider
 */
export function BasicAuthProvider(config?: BasicAuthConfig): BackendAuthProvider {
  return new BasicAuthBackendProvider(config);
}
