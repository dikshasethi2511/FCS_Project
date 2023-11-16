import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, mergeMap, tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'https://192.168.2.236/api';
  private ekycUrl = 'https://192.168.3.39:5000';

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}


  logIn(email: string, password: string): Observable<any> {
    const headers = {
      Authorization:
        'Basic ' +
        btoa(
          'devglan-client:$2a$04$e/c1/RfsWuThaWFCrcCuJeoyvwCV0URN/6Pn9ZFlrtIWaU/vj/BfG'
        ),
      'Content-type': 'application/x-www-form-urlencoded',
    };

    const body = new HttpParams()
      .set('username', email)
      .set('password', password)
      .set('grant_type', 'password');

    return this.http.post(`${this.apiUrl}/user-login`, body, { headers }).pipe(
      catchError((error: any) => {
        return throwError('Login failed. Please try again later.');
      }),
      map((response: any) => response.access_token),
      tap((token: string) => {
        this.router.navigate([
          '/user-profile',
          { email: email, password: password, access_token: token },
        ]);
      })
    );
  }

  register(
    name: string,
    email: string,
    password: string,
    file: File,
    publicKey: string,
    vc_inp: string,
    vc_actual: string,
    ekyc_password: string,
    wallet_id: string
  ): Observable<any> {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('aadhar_file', file);
    formData.append('publicKey', publicKey);
    formData.append('vc_inp', vc_inp);
    formData.append('vc_actual', vc_actual);
    formData.append('ekyc_password', ekyc_password);
    formData.append('wallet_id', wallet_id);

    return this.http.post(`${this.apiUrl}/user-register`, formData).pipe(
      catchError((error: any) => {
        return throwError('Registration failed. Please try again later.');
      })
    );
  }

  sendVerificationMail(email: string) {
    const emailDetails = { email: email };
    return this.http
      .post(`${this.apiUrl}/send-verification-email`, emailDetails)
      .pipe(
        catchError((error: any) => {
          return throwError('Verification failed. Message could not be sent.');
        }),
        retryWhen(errors =>
          errors.pipe(
            mergeMap((error, retryCount) => {
              if (retryCount < 3 && (error.status === 503 || error.status === 0)) {
                // Retry after a delay (e.g., 2 seconds)
                return timer(2000);
              }
              return throwError(error);
            })
          )
        ),
      );
  }

  checkEmailExists(email: string) {
    const emailDetails = { email: email };
    return this.http
      .post(`${this.apiUrl}/check-email-exists`, emailDetails)
      .pipe(
        catchError((error: any) => {
          return throwError('Verification failed. Message could not be sent.');
        })
      );
  }

  getKeyPair() {
    return this.http.get(`${this.apiUrl}/get-pki`).pipe(
      catchError((error: any) => {
        return throwError('PKI failed. Key could not be created.');
      })
    );
  }

  generateWallet() {
    return this.http.get(`${this.apiUrl}/generate-wallet`).pipe(
      catchError((error: any) => {
        return throwError('Wallet creation failed.');
      })
    );
  }
}
