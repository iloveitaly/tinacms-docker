/**
 * HTTP Basic Auth Frontend Provider for TinaCMS
 *
 * Provides authentication UI and credential management for the TinaCMS admin.
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import type { AbstractAuthProvider } from 'tinacms';

interface BasicAuthUser {
  username: string;
}

interface BasicAuthContextValue {
  user: BasicAuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const BasicAuthContext = createContext<BasicAuthContextValue | null>(null);

const AUTH_STORAGE_KEY = 'tina_basic_auth_token';

/**
 * Frontend Auth Provider for TinaCMS
 */
export class BasicAuthFrontendProvider implements AbstractAuthProvider {
  private authContext: BasicAuthContextValue | null = null;

  constructor() {}

  setContext(context: BasicAuthContextValue) {
    this.authContext = context;
  }

  /**
   * Called when user navigates to /admin and is not logged in
   * Returns a promise that resolves when authentication is complete
   */
  async authenticate(): Promise<any> {
    if (!this.authContext) {
      throw new Error('Auth context not initialized');
    }

    const token = this.getStoredToken();
    if (token) {
      // Already has a token, verify it works
      const user = await this.getUser();
      if (user) {
        return user;
      }
    }

    // Need to login - this will show the login UI
    return new Promise((resolve, reject) => {
      // The UI will handle the login, we just wait
      const checkInterval = setInterval(async () => {
        const user = await this.getUser();
        if (user) {
          clearInterval(checkInterval);
          resolve(user);
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Authentication timeout'));
      }, 300000);
    });
  }

  /**
   * Returns the current user or null if not authenticated
   */
  async getUser(): Promise<BasicAuthUser | null> {
    const token = this.getStoredToken();
    if (!token) {
      return null;
    }

    try {
      // Decode the token to get username
      const [username] = this.decodeToken(token);
      return { username };
    } catch {
      return null;
    }
  }

  /**
   * Returns the authentication token for API requests
   */
  async getToken(): Promise<{ id_token: string } | null> {
    const token = this.getStoredToken();
    if (!token) {
      return null;
    }
    return { id_token: token };
  }

  /**
   * Logs out the current user
   */
  async logout(): Promise<void> {
    if (this.authContext) {
      this.authContext.logout();
    }
  }

  /**
   * Returns the React context provider for the TinaCMS UI
   */
  getSessionProvider(): React.FC<{ children: React.ReactNode }> {
    const self = this;
    return function BasicAuthSessionProvider({ children }) {
      const [user, setUser] = useState<BasicAuthUser | null>(null);
      const [showLogin, setShowLogin] = useState(false);

      useEffect(() => {
        // Check for existing auth on mount
        const token = self.getStoredToken();
        if (token) {
          try {
            const [username] = self.decodeToken(token);
            setUser({ username });
          } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      }, []);

      const login = async (username: string, password: string) => {
        const token = self.encodeToken(username, password);
        localStorage.setItem(AUTH_STORAGE_KEY, token);
        setUser({ username });
        setShowLogin(false);
      };

      const logout = () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
      };

      const contextValue: BasicAuthContextValue = {
        user,
        login,
        logout,
      };

      // Set the context so authenticate() can access it
      self.setContext(contextValue);

      return (
        <BasicAuthContext.Provider value={contextValue}>
          {children}
          {!user && showLogin && <LoginModal onLogin={login} />}
        </BasicAuthContext.Provider>
      );
    };
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_STORAGE_KEY);
  }

  private encodeToken(username: string, password: string): string {
    const credentials = `${username}:${password}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  private decodeToken(token: string): [string, string] {
    const base64Credentials = token.replace('Basic ', '');
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');
    return [username, password];
  }
}

/**
 * Simple login modal component
 */
function LoginModal({ onLogin }: { onLogin: (username: string, password: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    try {
      await onLogin(username, password);
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>TinaCMS Login</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>
          {error && (
            <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Hook to access auth context
 */
export function useBasicAuth() {
  const context = useContext(BasicAuthContext);
  if (!context) {
    throw new Error('useBasicAuth must be used within BasicAuthSessionProvider');
  }
  return context;
}

/**
 * Factory function to create BasicAuth frontend provider
 */
export function BasicAuthClientProvider(): AbstractAuthProvider {
  return new BasicAuthFrontendProvider();
}
