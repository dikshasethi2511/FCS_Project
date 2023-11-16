import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CookieStorageService } from '../services/cookie-storage.service';
import { ContractService } from '../services/contract.service';
import { UserProfileService } from '../services/user-profile.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-view-past-history',
  templateUrl: './view-past-history.component.html',
  styleUrls: ['./view-past-history.component.css'],
})
export class ViewPastHistoryComponent {
  userData: any;
  contracts: any;
  purchasedProperties: any;
  soldProperties: any;

  constructor(
    private route: ActivatedRoute,
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
    this.showPastContracts();
  }

  showPastContracts() {
    this.contractService
      .showPastContracts(this.userData.email, this.cookieService.getToken())
      .subscribe(
        (data) => {
          this.contracts = data;
          this.soldProperties = [];
          this.purchasedProperties = [];

          for (const contract of this.contracts) {
            if (contract.seller_email === this.userData.email) {
              // If the seller_email matches userData.email, append to soldProperties
              this.soldProperties.push(contract);
            } else {
              // Otherwise, append to purchasedProperties
              this.purchasedProperties.push(contract);
            }
          }
        },
        (error) => {
          this.snackBar.open(
            'Error fetching user contracts',
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
        (error: any) => {
        }
      );
  }
}
