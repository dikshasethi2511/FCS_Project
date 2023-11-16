import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root',
})
export class CookieStorageService {
  private readonly tokenKey = 'jwtToken';

  constructor(private cookieService: CookieService) {}

  setToken(token: string): void {
    // Set the JWT token in an HTTP-only cookie
    this.cookieService.set(
      this.tokenKey,
      token,
      undefined,
      '/',
      undefined,
      true,
      'Strict'
    );
  }

  getToken(): string | null {
    // Retrieve the JWT token from the cookie
    return this.cookieService.get(this.tokenKey);
  }

  removeToken(): void {
    // Remove the JWT token from the cookie
    this.cookieService.delete(this.tokenKey, '/');
  }
}
