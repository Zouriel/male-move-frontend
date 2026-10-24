import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from './auth-session.service';
import { environment } from '../../environments/environment';

export type SignInResult = 'ok' | 'invalid' | 'unavailable';

/**
 * Development and staging builds only: gets an in-memory token from the API's local token issuer
 * (enabled only when the API runs in Development or Staging with Authentication__DevelopmentSigningKey).
 * Production builds never call it.
 */
@Injectable({ providedIn: 'root' })
export class LocalSignIn {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthSession);
  readonly enabled = environment.localSignIn;

  async signIn(username?: string, password?: string): Promise<SignInResult> {
    if (!this.enabled) return 'unavailable';
    try {
      const response = await firstValueFrom(this.http.post<{ data?: { accessToken?: string } }>('/api/v1/dev/token', { username, password }));
      if (!response.data?.accessToken) return 'unavailable';
      this.auth.acceptOidcToken(response.data.accessToken);
      return 'ok';
    } catch (error) {
      return error instanceof HttpErrorResponse && error.status === 401 ? 'invalid' : 'unavailable';
    }
  }
}

/** At startup, sign in silently when the API needs no login (local development without a password). */
export async function developmentSignIn(): Promise<void> {
  const signIn = inject(LocalSignIn);
  if (signIn.enabled) await signIn.signIn();
}
