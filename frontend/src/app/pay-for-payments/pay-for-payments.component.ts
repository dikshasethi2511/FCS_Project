import { Component } from '@angular/core';
import { UserProfileService } from '../services/user-profile.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CookieStorageService } from '../services/cookie-storage.service';
import { ContractService } from '../services/contract.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-pay-for-payments',
  templateUrl: './pay-for-payments.component.html',
  styleUrls: ['./pay-for-payments.component.css'],
})
export class PayForPaymentsComponent {
  userData: any;
  contracts: any;
  contractToSign: any;
  walletId: string = '';
  walletPin: string = '';
  responseMessageOne: string = '';
  responseMessageTwo: string = '';
  amountToPay: string = '';

  otpVerificationVisible: boolean = false;
  payVerificationCode: string = 'ahf58@ml';
  transactionVerifyInput: string = '';

  constructor(
    private userProfileService: UserProfileService,
    private route: ActivatedRoute,
    private router: Router,
    private cookieService: CookieStorageService,
    private contractService: ContractService,
    private snackBar: MatSnackBar,
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

  togglePaymentForm(contract: any) {
    // Toggle the showPaymentForm property for the clicked contract
    contract.showPaymentForm = !contract.showPaymentForm;
  }

  ngOnInit() {
    this.responseMessageOne = '';
    this.responseMessageTwo = '';
    this.showPendingPayments();
  }

  showPendingPayments() {
    this.contractService
      .showPendingPaymentsForBuyer(
        this.userData.email,
        this.cookieService.getToken()
      )
      .subscribe(
        (data) => {
          this.contracts = data;
        },
        (error) => {
          this.snackBar.open(
            'Error fetching contracts!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  showTransactionVerification(contract: any){

    this.otpVerificationVisible = true;

    this.userProfileService
      .sendVerificationMail(this.userData.email)
      .subscribe(
        (data: any) => {
          this.payVerificationCode = data['verification_code'];
        },
        (error: any) => {
          this.snackBar.open(
            'Could not be verified!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
    
  }

  payForProperty(contract: any) {

    if (this.otpVerificationVisible) {
      if (this.transactionVerifyInput === this.payVerificationCode) {

        this.contractService
        .performTransaction(
          this.userData.email,
          this.walletId,
          this.walletPin,
          this.amountToPay,
          contract.id,
          this.cookieService.getToken()
        )
        .subscribe(
          (data: any) => {
            this.responseMessageOne = data.message;
          },
          (error) => {
            this.snackBar.open(
              'Could not make payment! Check amount and wallet details carefully!',
              'Close',
              {
                duration: 5000,
              }
            );
          }
        );

        setTimeout(() => {
          this.transactionVerifyInput = '';
          this.otpVerificationVisible = false;
        }, 100); 
      } else {
        this.payVerificationCode = 'ahf58@ml';

        setTimeout(() => {
          this.transactionVerifyInput = '';
          this.otpVerificationVisible = false;
        }, 100);
      }
    } else {
      this.otpVerificationVisible = true;
    }
    
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
          this.snackBar.open(
            'Unable to go to home page!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }
}
