import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AdminProfileService {
  private apiUrl = 'https://192.168.2.236/api';

  constructor(private http: HttpClient, private router: Router) {}

  adminLogin(email: string, password: string): Observable<any> {
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
        return error;
      }),
      map((response: any) => response.access_token),
      tap((token: string) => {
        this.router.navigate([
          '/admin-profile',
          { email: email, password: password, access_token: token },
        ]);
      })
    );
  }

  deletePropertyDocument(
    email: string,
    documentId: string,
    token: string | null
  ): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const body = { document_id: documentId , doer_email: email};
    return this.http.post(`${this.apiUrl}/delete-property-documents`, body, {
      headers,
    });
  }

  getAllProperties(
    email: string,
    password: string,
    token: string | null
  ): Observable<any[]> {
    const body = {
      email: email,
      password: password,
    };
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post<any[]>(
      `${this.apiUrl}/admin-get-all-properties`,
      body,
      {
        headers,
      }
    );
  }

  getAllPropertyDocuments(
    doer_email: string,
    property_id: string,
    token: string | null
  ): Observable<any> {
    const body = {
      doer_email: doer_email,
      propertyId: property_id,
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http
      .post(`${this.apiUrl}/get-all-property-documents`, body, { headers })
      .pipe();
  }

  verifyPropertyDocuments(
    doer_email: string,
    property_id: string,
    token: string | null
  ): Observable<any> {
    const body = {
      doer_email: doer_email,
      propertyId: property_id,
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http
      .post(`${this.apiUrl}/admin-verify-all-property-documents`, body, {
        headers,
      })
      .pipe();
  }

  getAllUsers(
    email: string,
    password: string,
    token: string | null
  ): Observable<any[]> {
    const body = {
      email: email,
      password: password,
    };
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post<any[]>(`${this.apiUrl}/admin-get-all-users`, body, { headers });
  }

  deleteUser(
    adminEmail: string,
    password: string,
    userEmail: string,
    token: string | null
  ): Observable<any> {
    const body = {
      adminEmail: adminEmail,
      adminPassword: password,
      toBeDeletedEmail: userEmail,
    };
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post<any>(`${this.apiUrl}/admin-delete-user`, body, {
      headers,
    });
  }

  deleteProperty(
    adminEmail: string,
    password: string,
    property_id: string,
    token: string | null
  ): Observable<any> {
    const body = {
      adminEmail: adminEmail,
      adminPassword: password,
      propertyId: property_id,
    };
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post<any>(`${this.apiUrl}/admin-delete-property`, body, {
      headers,
    });
  }

  viewTransactions(adminEmail: string,
    password: string, token: string | null): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    const body = {
      email: adminEmail,
      password: password
    };
    return this.http
      .post(`${this.apiUrl}/view-transaction`, body, { headers })
      .pipe();
  }
}
