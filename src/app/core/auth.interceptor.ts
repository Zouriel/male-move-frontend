import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSession } from './auth-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthSession).token();
  if (!token || !request.url.startsWith('/api/')) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
