import { Injectable, computed, signal } from '@angular/core';

/** OIDC integration seam. Access tokens stay in memory and are never persisted in browser storage. */
@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly accessToken = signal<string | null>(null);
  private readonly signedIn = computed(() => this.accessToken() !== null);
  get configured(): boolean { return this.signedIn(); }
  token(): string | null { return this.accessToken(); }

  /** Called only by the configured OIDC authorization-code + PKCE callback adapter. */
  acceptOidcToken(token: string): void {
    if (!token || token.split('.').length !== 3) throw new Error('A JWT access token is required.');
    this.accessToken.set(token);
  }

  clear(): void { this.accessToken.set(null); }
}
