import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthTokenService } from '../services/auth-token.service';

/**
 * Attaches the access token and refreshes it once on a 401.
 *
 * Access tokens are short-lived by design, so meeting an expired one
 * mid-session is the normal case rather than an error. Retrying exactly once
 * avoids the obvious trap: refreshing on the refresh call itself, which loops
 * forever against an expired session.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthTokenService);
  const token = auth.accessToken();

  // Never attach a token to the auth endpoints, and never try to refresh a
  // failing refresh.
  const isAuthCall =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/admin/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh');

  const authed =
    token && !isAuthCall ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      const is401 = err instanceof HttpErrorResponse && err.status === 401;
      if (!is401 || isAuthCall || !token) return throwError(() => err);

      return auth.refresh().pipe(
        switchMap((res) => next(req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } }))),
        catchError((refreshErr: unknown) => {
          // The session is genuinely over. Clearing it stops the app showing a
          // signed-in shell that cannot load anything.
          auth.logout();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
