import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CookieStorageService } from '../services/cookie-storage.service';
import { ContractService } from '../services/contract.service';
import { UserProfileService } from '../services/user-profile.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-ongoing-contracts-for-buyer',
  templateUrl: './ongoing-contracts-for-buyer.component.html',
  styleUrls: ['./ongoing-contracts-for-buyer.component.css'],
})
export class OngoingContractsForBuyerComponent {
  userData: any;
  contracts: any;
  purchasedProperties: any;
  soldProperties: any;
  responseMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cookieService: CookieStorageService,
    private contractService: ContractService,
    private userProfileService: UserProfileService,
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
    this.showOngoingContractsForBuyer();
  }

  goToHomePage() {
    this.userProfileService
      .goToHomePage(
        this.userData.email,
        this.userData.password,
        this.cookieService.getToken()
      )
      .subscribe(
        (response: any) => {
          this.responseMessage = response.message;
        },
        (error: any) => {
          this.responseMessage = 'Redirecting error';
          this.snackBar.open(
            'Unable to redirect to home page',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  showOngoingContractsForBuyer() {
    this.contractService
      .showOngoingContractsForBuyer(
        this.userData.email,
        this.cookieService.getToken()
      )
      .subscribe(
        (data) => {
          this.contracts = data;
        },
        (error) => {
          this.snackBar.open(
            'Error fetching contracts',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  showPendingPayments() {
    this.router.navigate([
      '/pay-for-payments',
      {
        email: this.userData.email,
        password: this.userData.password,
        access_token: this.cookieService.getToken(),
      },
    ]);
  }
}
