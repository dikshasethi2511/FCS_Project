import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class ContractService {
  private apiUrl = 'https://192.168.2.236/api';

  constructor(private http: HttpClient, private router: Router) {}

  createContract(_doer_email:string, allContractData: any, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const contractDetails = {
      doer_email:_doer_email,
      id: '',
      buyer_email: allContractData.buyer_email,
      seller_email: allContractData.seller_email,
      property_name: allContractData.property_name,
      property_value: allContractData.property_value,
      property_type: allContractData.property_type,
      property_location: allContractData.property_location,
      property_amenities: allContractData.property_amenities,
      property_fromDate: allContractData.property_fromDate,
      property_toDate: allContractData.property_toDate,
      property_id: allContractData.property_id,
      for_sale: allContractData.for_sale,
    };
    return this.http.post(`${this.apiUrl}/create-contract`, contractDetails, {
      headers,
    });
  }

  checkContractExists(doer_email:string, propertyData: any, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const contractDetails = {
      doer_email:doer_email,
      buyer_email: propertyData.buyer_email,
      seller_email: propertyData.seller_email,
      property_id: propertyData.property_id,
    };
    return this.http.post(
      `${this.apiUrl}/check-contract-exists`,
      contractDetails,
      { headers }
    );
  }

  deleteContract(doer_email: string,contract_id: any, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const body = {
      doer_email: doer_email,
      contract_id: contract_id,
    };

    return this.http.post(`${this.apiUrl}/delete-contract`, body, { headers });
  }

  markPropertySold(property_id: any, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const body = {
      propertyId: property_id,
    };

    return this.http.post(`${this.apiUrl}/mark-property-sold`, body, {
      headers,
    });
  }

  showPastContracts(email: string, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const body = {
      email: email,
    };

    return this.http.post(`${this.apiUrl}/show-past-history-contracts`, body, {
      headers,
    });
  }

  showPendingPaymentsForBuyer(email: string, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const body = {
      email: email,
    };

    return this.http.post(
      `${this.apiUrl}/show-pending-payments-for-buyer`,
      body,
      {
        headers,
      }
    );
  }

  performTransaction(
    doer_email:string,
    wallet_id: string,
    wallet_password: string,
    amount: string,
    contract_id: string,
    token: string | null
  ) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const body = {
      doer_email:doer_email,
      wallet_id: wallet_id,
      wallet_pin: wallet_password,
      amount: amount,
      contract_id: contract_id,
    };

    return this.http.post(`${this.apiUrl}/send-money-to-portal`, body, {
      headers,
    });
  }

  showOngoingContractsForBuyer(email: string, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const body = {
      email: email,
    };

    return this.http.post(`${this.apiUrl}/ongoing-contracts-for-buyer`, body, {
      headers,
    });
  }

  getContractDetails(doer_email:string,allContractData: any, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const contractDetails = {
      doer_email:doer_email,
      id: '',
      buyer_email: allContractData.buyer_email,
      seller_email: allContractData.seller_email,
      property_name: allContractData.property_name,
      property_value: allContractData.property_value,
      for_sale: allContractData.for_sale,
      property_location: allContractData.property_location,
      property_amenities: allContractData.property_amenities,
      property_fromDate: allContractData.property_fromDate,
      property_toDate: allContractData.property_toDate,
      property_id: '',
    };
    return this.http.post(
      `${this.apiUrl}/get-contract-details`,
      contractDetails,
      { headers }
    );
  }

  getPortalSig(contractID: string, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(
      `${this.apiUrl}/portalSign-contract`,
      { contractId: contractID },
      { headers }
    );
  }

  initContract(contractId: string, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post(`${this.apiUrl}/portal-init-contract`, {
      contractId: contractId
    },{headers});
  }

  verifyValidContract(portalPublicKey: string, portalEncryption: any, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    const body = {
      key: portalPublicKey,
      message: portalEncryption.message,
      sign: portalEncryption.signature,
    };
    return this.http.post(`${this.apiUrl}/portal-verify-portalSignature`, body,{headers});
  }

  addUserSignature(user_private_key: string, contract_hash: string, token: string | null) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    const body = { key: user_private_key, contract_hash: contract_hash };
    return this.http.post(`${this.apiUrl}/add-user-signature`, body,{headers});
  }

  verifyUserSignature(
    contractId: string,
    encoded_message: string,
    email: string, token: string | null
  ) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    const body = {
      contract_id: contractId,
      encoded_message: encoded_message,
      email: email,
    };
    return this.http.post(`${this.apiUrl}/portal-verify-UserSignature`, body,{headers});
  }
}
