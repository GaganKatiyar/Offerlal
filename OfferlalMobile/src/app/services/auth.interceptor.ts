import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthTokenService } from './auth-token.service';

/** Shared across calls so a burst of 401s triggers one refresh, not several. */
let refreshing = false;
const refreshed$ = new BehaviorSubject<string | null>(null);

/**
 * Attaches the access token, and refreshes once on a 401.
 *
 * The refresh is gated because a screen typically fires several requests at
 * once — the home tab asks for products and categories together. Without the
 * gate an expired token produces one refresh per in-flight request, and since
 * refresh tokens rotate, the losers would present an already-used token. The
 * server treats a reused refresh token as theft and revokes the whole family,
 * so the uncoordinated version does not just waste calls, it signs the user out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(AuthTokenService);

  const isAuthCall = req.url.includes('/auth/');
  const token = tokens.accessToken;
  const authed = token && !isAuthCall
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      const is401 = err instanceof HttpErrorResponse && err.status === 401;
      if (!is401 || isAuthCall || !tokens.refreshToken) return throwError(() => err);

      if (refreshing) {
        // Wait for the in-flight refresh, then retry with whatever it produced.
        return refreshed$.pipe(
          filter((t): t is string => t !== null),
          take(1),
          switchMap((fresh) => next(req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } }))),
        );
      }

      refreshing = true;
      refreshed$.next(null);

      return fetchRefresh(tokens).pipe(
        switchMap((fresh) => {
          refreshing = false;
          refreshed$.next(fresh);
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } }));
        }),
        catchError((refreshErr: unknown) => {
          refreshing = false;
          // The refresh token is spent or revoked: this session is over.
          tokens.clear();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};

/**
 * Refreshes outside Angular's HttpClient on purpose.
 *
 * Calling HttpClient here would re-enter this same interceptor, so a failing
 * refresh would try to refresh itself. fetch sidesteps that entirely.
 */
function fetchRefresh(tokens: AuthTokenService) {
  return new Observable<string>((subscriber) => {
    fetch(`${environment.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`refresh failed: ${res.status}`);
        const body = (await res.json()) as { accessToken: string; refreshToken: string };
        tokens.saveTokens(body.accessToken, body.refreshToken);
        subscriber.next(body.accessToken);
        subscriber.complete();
      })
      .catch((e) => subscriber.error(e));
  });
}
