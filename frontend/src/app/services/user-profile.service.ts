// user-profile.service.ts
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private apiUrl = 'https://192.168.2.236/api';

  constructor(private http: HttpClient, private router: Router) {}

  private userLoggedIn: any;

  getUserProfile(email: string, token: string | null): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(
      `${this.apiUrl}/user-profile`,
      { email },
      { headers }
    );
  }

  updateUserProfile(updatedData: any, token: string | null): Observable<any> {
    const body = {
      email: updatedData.email,
      name: updatedData.name,
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/update-user-profile`, body, {
      headers,
    });
  }

  getAllUserProperties(email: string, token: string | null): Observable<any> {
    const body = {
      email: email,
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http
      .post(`${this.apiUrl}/get-all-user-properties`, body, { headers })
      .pipe();
  }

  getAllPropertyDocuments(
    doer_email:string,
    property_id: string,
    token: string | null
  ): Observable<any> {
    const body = {
      doer_email:doer_email,
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

  searchProperty(
    doer_email: string,
    email: string,
    prop_name: string,
    token: string | null
  ): Observable<any> {
    const body = {
      doer_email: doer_email,
      name: prop_name,
      owner_email: email,
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/search-user-property`, body, {
      headers,
    });
  }

  addUserProperty(
    email: string,
    new_property: any,
    token: string | null
  ): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    const formData = new FormData();
    formData.append('name', new_property.name);
    formData.append('email', email);
    formData.append('price', new_property.price);
    formData.append('for_sale', new_property.type);
    formData.append('location', new_property.location);
    formData.append('amenities', new_property.amenities);
    formData.append('start_date', new_property.start_date);
    formData.append('end_date', new_property.end_date);

    return this.http.post(`${this.apiUrl}/add-user-property`, formData, {
      headers,
    });
  }

  addPropertyDocument(
    doer_email:string,
    property_id: string,
    user_private_key: string,
    document: any,
    token: string | null
  ): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const formData = new FormData();
    
    formData.append('doer_email', doer_email);
    formData.append('property_id', property_id);
    formData.append('user_private_key', user_private_key);
    formData.append('document', document);

    return this.http.post(`${this.apiUrl}/add-property-documents`, formData, {
      headers,
    });
  }

  deletePropertyDocument(
    doer_email:string,
    documentId: string,
    token: string | null
  ): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const body = { doer_email:doer_email,document_id: documentId };
    return this.http.post(`${this.apiUrl}/delete-property-documents`, body, {
      headers,
    });
  }

  modifyUserProperty(
    type: string,
    email: string,
    property_id: string,
    new_property: any,
    token: string | null
  ): Observable<any> {
    let forSale = null;
    if (type !== 'Rent') {
      forSale = true;
    } else {
      forSale = false;
    }
    const body = {
      property_id: property_id,
      email: email,
      name: new_property.new_name,
      price: new_property.new_value,
      location: new_property.new_location,
      amenities: new_property.new_amenities,
      start_date: new_property.newFromDate,
      end_date: new_property.newToDate,
      documents: '',
      for_sale: forSale,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/modify-user-property`, body, {
      headers,
    });
  }

  deleteUserProperty(
    email: string,
    property_id: string,
    token: string | null
  ): Observable<any> {
    const body = {
      email: email,
      propertyId: property_id,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/delete-user-property`, body, {
      headers,
    });
  }

  toggleViewListing(
    doer_email:string,
    property_id: string,
    token: string | null
  ): Observable<any> {
    const body = {
      doer_email:doer_email,
      propertyId: property_id,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/toggle-view-listing-property`, body, {
      headers,
    });
  }

  getUserContracts(email: string, token: string | null): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(
      `${this.apiUrl}/available-contracts`,
      { email },
      { headers }
    );
  }

  goToHomePage(
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
          '/home-page',
          { email: email, password: password, access_token: token },
        ]);
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
        })
      );
  }

  getWalletBalance(doer_email:string,wallet_id: string, token: string | null): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(
      `${this.apiUrl}/view-balance`,
      {doer_email:doer_email, wallet_id: wallet_id },
      { headers }
    );
  }

  addMoneyToWallet(doer_email:string, wallet_id: string, token: string | null): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(
      `${this.apiUrl}/add-money-to-wallet`,
      { doer_email:doer_email,wallet_id: wallet_id },
      { headers }
    );
  }

  canAddMoney(doer_email: string, wallet_id: string, token: string | null): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(
      `${this.apiUrl}/can-add-money-to-wallet`,
      {doer_email:doer_email, wallet_id: wallet_id },
      { headers }
    );
  }
}
