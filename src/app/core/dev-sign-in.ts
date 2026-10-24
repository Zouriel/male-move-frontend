import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from './auth-session.service';
import { environment } from '../../environments/environment';

/**
 * Development and staging builds only: asks the API's local token issuer (enabled only when the API runs in
 * Development or Staging with Authentication__DevelopmentSigningKey) for an in-memory token. Production builds skip it.
 */
export async function developmentSignIn(): Promise<void> {
  if (!environment.localSignIn) return;
  const http = inject(HttpClient);
  const auth = inject(AuthSession);
  try {
    const response = await firstValueFrom(http.post<{ data?: { accessToken?: string } }>('/api/v1/dev/token', {}));
    if (response.data?.accessToken) auth.acceptOidcToken(response.data.accessToken);
  } catch {
    console.warn('Development sign-in unavailable; start the API with a development signing key.');
  }
}
