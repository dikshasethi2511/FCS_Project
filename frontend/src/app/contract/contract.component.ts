import { Component } from '@angular/core';
import { UserProfileService } from '../services/user-profile.service';
import { ActivatedRoute } from '@angular/router';
import { ContractService } from '../services/contract.service';
import { CookieStorageService } from '../services/cookie-storage.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Location } from '@angular/common';

interface NavigationState {
  navigationId: number;
  [key: string]: any; // Add other properties if needed
}

@Component({
  selector: 'app-contract',
  templateUrl: './contract.component.html',
  styleUrls: ['./contract.component.css'],
})
export class ContractComponent {
  publicKeyOfPortal: string = '';
  encryptedContract: string = '';
  allContractData: any;
  portalSign: any;
  privateKey: string = '';
  portalEncryption: any;

  contractToSign: any;
  isAgreed = false;

  currentContractSignature = '';
  isPortalGenerated = { message: '', status: '' };
  isBuyerVerified = { message: '', status: '' };
  verificationMessage = '';
  showGoBackButton = false;
  goBackWithoutSigning = true;

  constructor(
    private userProfileService: UserProfileService,
    private route: ActivatedRoute,
    private contractService: ContractService,
    private cookieService: CookieStorageService,
    private snackBar: MatSnackBar,
    private location: Location
  ) {
    this.publicKeyOfPortal =
      '-----BEGIN PUBLIC KEY-----AkOm9IZ67pCtKC1/Q/o8WuAnfRiuw5nc7rlkwM5HF743laOJWUYSKiIYHiGZFeldC6Iiyx9VvWnMbxPOsCsvA9zkQSFt7NN+sZKBL/p2FjNr3PPzcrkziEufLYqrqgAgzt4CyZUuBcegcT6gPc8sFQD2rRxdMOc6xHHITtMDmNwjCW6kCfdCPBhOBrFlscRF9iabcbV6Q4I62GY36V9ojsz7hTtiMMYxIvZNFY6gllFziTNm1dS8h54YynCXmE6mIPwVH1ckW+ZqMYulzqI27fItXmPA6luv0I0lGEObwDGKRy08PoKmR6tuRS6U6zxRlcogdt6fOYcrWk+Xk9q6W9k=-----END PUBLIC KEY-----';

    this.route.params.subscribe((params) => {
      this.allContractData = params;
      this.cookieService.setToken(this.allContractData.access_token);
      this.allContractData = Object.keys(this.allContractData).reduce(
        (acc: any, key) => {
          if (key !== 'access_token') {
            acc[key] = this.allContractData[key];
          }
          return acc;
        },
        {}
      );
    });

    this.contractService.initContract(this.allContractData['id'], this.cookieService.getToken()).subscribe(
      (data) => {
        this.portalEncryption = data;
      },
      (error) => {
        this.snackBar.open(
          'Error generating contract',
          'Close',
          {
            duration: 5000,
          }
        );
      }
    );
  }

  onCheckboxChange() {
    this.contractService
      .verifyValidContract(this.publicKeyOfPortal, this.portalEncryption, this.cookieService.getToken())
      .subscribe(
        (response: any) => {
          this.isPortalGenerated['message'] = response['message'];
          this.isPortalGenerated['status'] = response['status'];

          if (this.isPortalGenerated['status']) {
            this.isAgreed = true;
          } else {
            this.contractService
              .deleteContract(
                this.allContractData.email,
                this.allContractData['id'],
                this.cookieService.getToken()
              )
              .subscribe(
                (response: any) => {
                  this.snackBar.open(
                    'The contract is not generated by the portal. Could not be verified!',
                    'Close',
                    {
                      duration: 5000,
                    }
                  );
                  this.gotToSearchProps();
                },
                (error: any) => {
                  this.snackBar.open(
                    'Unable to go to home page',
                    'Close',
                    {
                      duration: 5000,
                    }
                  );
                }
              );
          }
        },
        (error) => {
          this.snackBar.open(
            'Error verifying contract!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  async submitPrivateKey() {
    this.contractService
      .addUserSignature(this.privateKey, this.allContractData.contract_hash, this.cookieService.getToken())
      .subscribe(
        (response: any) => {
          this.encryptedContract = response['encoded_message'];
          this.contractService
            .verifyUserSignature(
              this.allContractData['id'],
              this.encryptedContract,
              this.allContractData.email,
              this.cookieService.getToken(),
            )
            .subscribe(
              (response: any) => {
                this.isBuyerVerified['message'] = response['message'];
                this.isBuyerVerified['status'] = response['status'];
                this.verificationMessage = this.isBuyerVerified['message'];
                this.goBackWithoutSigning = false;
                this.showGoBackButton = true;
              },
              (error) => {
                if (
                  this.allContractData.seller_email !==
                  this.allContractData.email
                ) {
                  this.contractService
                    .deleteContract(
                      this.allContractData.email,
                      this.allContractData['id'],
                      this.cookieService.getToken()
                    )
                    .subscribe(
                      (response: any) => {
                        this.snackBar.open(
                          'The private key is incorrect. Could not be verified!',
                          'Close',
                          {
                            duration: 5000,
                          }
                        );
                        this.gotToSearchProps();
                      },
                      (error: any) => {
                        this.snackBar.open(
                          'User unable to go to homepage',
                          'Close',
                          {
                            duration: 5000,
                          }
                        );
                      }
                    );
                } else {
                  this.snackBar.open(
                    'The private key is incorrect. Could not be verified!',
                    'Close',
                    {
                      duration: 5000,
                    }
                  );
                  this.gotToSearchProps();
                }
              }
            );
        },
        (error) => {
          this.snackBar.open(
            'Error encrypting contract!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  goBackWithoutSigningContract() {
    if (this.allContractData.seller_email !== this.allContractData.email) {
      this.contractService
        .deleteContract(
          this.allContractData.email,
          this.allContractData['id'],
          this.cookieService.getToken()
        )
        .subscribe(
          (response: any) => {
            this.snackBar.open('Contract was not created!', 'Close', {
              duration: 5000,
            });
            this.gotToSearchProps();
          },
          (error: any) => {
            this.snackBar.open(
              'Could not delete contract!',
              'Close',
              {
                duration: 5000,
              }
            );
          }
        );
    } else {
      this.snackBar.open('Contract was not created!', 'Close', {
        duration: 5000,
      });
      this.gotToSearchProps();
    }
  }

  previousState: NavigationState | null = null;


  ngOnInit() {
    this.verificationMessage = '';

    this.previousState = this.location.getState() as NavigationState;

    this.location.onUrlChange((url: string, state: unknown) => {
      const currentState = this.location.getState() as NavigationState;

      if (this.previousState && currentState.navigationId < this.previousState.navigationId) {
        this.contractService
        .deleteContract(
          this.allContractData.email,
          this.allContractData['id'],
          this.cookieService.getToken()
        )
        .subscribe(
          (response: any) => {
            if (response.wasDeleted){
              this.snackBar.open('Contract deleted!', 'Close', {
                duration: 5000,
              });
            }

            else {
              this.snackBar.open('Contract not deleted!', 'Close', {
                duration: 5000,
              });
            }
            
            this.gotToSearchProps();
          },
          (error: any) => {
            this.snackBar.open(
              'Could not delete contract!',
              'Close',
              {
                duration: 5000,
              }
            );
          }
        );
        
      }

      this.previousState = currentState;
    });

  }

  gotToSearchProps() {
    this.userProfileService
      .goToHomePage(
        this.allContractData.email,
        this.allContractData.password,
        this.cookieService.getToken()
      )
      .subscribe(
        (response: any) => {
        },
        (error: any) => {
          this.snackBar.open(
            'Unable to got to homepage!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }
}
