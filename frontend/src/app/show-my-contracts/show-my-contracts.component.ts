import { Component } from '@angular/core';
import { UserProfileService } from '../services/user-profile.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CookieStorageService } from '../services/cookie-storage.service';
import { ContractService } from '../services/contract.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-show-my-contracts',
  templateUrl: './show-my-contracts.component.html',
  styleUrls: ['./show-my-contracts.component.css'],
})
export class ShowMyContractsComponent {
  userData: any;
  contracts: any;
  contractToSign: any;

  constructor(
    private userProfileService: UserProfileService,
    private route: ActivatedRoute,
    private router: Router,
    private cookieService: CookieStorageService,
    private contractService: ContractService,
    private snackBar: MatSnackBar
  ) {
    this.route.params.subscribe((params) => {
      this.userData = params;
      this.cookieService.setToken(this.userData.access_token);
      this.userData = Object.keys(this.userData).reduce((acc: any, key) => {
        if (key !== 'access_token') {
          acc[key] = this.userData[key];
        }
        return acc;
      }, {});
    });
  }

  ngOnInit() {
    this.userProfileService
      .getUserContracts(this.userData.email, this.cookieService.getToken())
      .subscribe(
        (data) => {
          this.contracts = data;
        },
        (error) => {}
      );
  }

  generateContract(contract: any) {
    const sendToContract = {
      property_name: contract.property_name,
      property_location: contract.property_location,
      property_value: contract.property_value,
      for_sale: contract.for_sale,
      property_amenities: contract.property_amenities,
      property_toDate: contract.property_toDate,
      property_fromDate: contract.property_fromDate,
      buyer_email: contract.buyer_email,
      password: this.userData.password,
      email: this.userData.email,
      seller_email: contract.seller_email,
    };
    this.contractService
      .getContractDetails(this.userData.email, sendToContract, this.cookieService.getToken())
      .subscribe(
        (data) => {
          this.contractToSign = data;
          this.contractToSign['password'] = this.userData.password;
          this.contractToSign['email'] = this.userData.email;
          this.contractToSign['access_token'] = this.cookieService.getToken();
          this.router.navigate(['/create-contract', this.contractToSign]);
        },
        (error) => {
          this.snackBar.open(
            'The contract does not exist',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  goToHomePage() {
    this.userProfileService
      .goToHomePage(
        this.userData.email,
        this.userData.password,
        this.cookieService.getToken()
      )
      .subscribe(
        (response: any) => {},
        (error: any) => {}
      );
  }
}
