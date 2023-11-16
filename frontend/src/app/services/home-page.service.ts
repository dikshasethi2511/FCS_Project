// user-data.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { bootstrapApplication } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class HomePageService {
  private apiUrl = 'https://192.168.2.236/api';

  constructor(private http: HttpClient, private router: Router) {}

  getUsersWithProperties(
    email: string,
    token: string | null
  ): Observable<any[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post<any[]>(
      `${this.apiUrl}/available-properties`,
      { email },
      { headers }
    );
  }

  goToUserProfile(
    email: string,
    password: string,
    token: string | null
  ): Observable<any> {
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
      tap(() => {
        this.router.navigate([
          '/user-profile',
          { email: email, password: password, access_token: token },
        ]);
      })
    );
  }

  getFilteredProperties(
    email: string,
    filters: any,
    token: string | null
  ): Observable<any[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    const body = {
      user_email: email,
      sale: filters.filterType,
      minPrice: filters.filterMinValue,
      maxPrice: filters.filterMaxValue,
      location: filters.filterLocation,
      amenities: filters.filterAmenities,
      startDate: filters.filterStartDate,
      endDate: filters.filterEndDate,
    };

    return this.http.post<any[]>(`${this.apiUrl}/filter-properties`, body, {
      headers,
    });
  }

  reportUser(
    emailUser: string,
    emailReported: string,
    token: string | null
  ): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    const body = {
      report_by: emailUser,
      reported: emailReported,
      type_report: 'User',
    };
    return this.http.post(`${this.apiUrl}/report`, body, { headers });
  }
  reportProperty(
    emailUser: string,
    property_id: string,
    token: string | null
  ): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    const body = {
      report_by: emailUser,
      reported: property_id,
      type_report: 'Property',
    };
    return this.http.post(`${this.apiUrl}/report`, body, { headers });
  }
}
