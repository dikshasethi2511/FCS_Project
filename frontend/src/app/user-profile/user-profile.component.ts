import { Component, OnInit } from '@angular/core';
import { UserProfileService } from '../services/user-profile.service';
import { AuthService } from '../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CookieStorageService } from '../services/cookie-storage.service';
import { MatSnackBar } from '@angular/material/snack-bar';


@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
})
export class UserProfileComponent implements OnInit {
  userProfile: any = {};
  userData: any;
  user_wallet = { id: '', available_balance: '' };
  isAddMoneyDisabled: boolean = false;

  newUserData: any = {};
  responseMessage: string = '';
  addMoneyResponseMessage: string = '';
  editMode: boolean = false;

  newProperty = {
    name: '',
    price: '',
    type: '',
    location: '',
    amenities: '',
    start_date: '',
    end_date: '',
  };
  modifiedProperty = {
    old_name: '',
    new_name: '',
    new_value: '',
    new_type: null,
    new_location: '',
    new_amenities: '',
    newFromDate: '',
    newToDate: '',
  };
  deletedProperty = { name: '' };

  showAddPropertyForm = false;
  showModifyPropertyForm = false;
  showDeletePropertyForm = false;
  userProperties: any = [];
  pdfContent: any;

  deleteVerificationCode: string = 'cdjdoyk';
  deletePopUpInput: string = '';
  deleteConfirmationMessage: string = '';
  deleteConfirmationMessageClass: string = '';
  showDeleteConfirmation: boolean = false;
  selectedPropertyDocument: any;
  otpVerificationVisible: boolean = false;
  deleteButtonsDisabled: boolean = false;

  showMessagePopup: boolean = false;
  messagePopupText: string = '';
  canShowPopUp: boolean = true;
  messagePopUpCountdown: number = 3;
  private timer: any;

  UploadDocumentButtonVisible: boolean = false;
  addDocumentProperty = { name: '' };
  privateKeyInput: string = '';
  addDocumentButtonsDisabled: boolean = false;
  newAddedDocument: File = new File([], 'empty.pdf', {
    type: 'application/pdf',
  });

  constructor(
    private userProfileService: UserProfileService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private cookieService: CookieStorageService,
    private router: Router,
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

  viewProperties() {
    this.userProfileService
      .getUserProfile(this.userData.email, this.cookieService.getToken())
      .subscribe(
        (data) => {
          this.userProfile = data;
          this.user_wallet.id = data['wallet_id'];
          this.userProfileService
            .getWalletBalance(
              this.userData.email,
              this.user_wallet.id,
              this.cookieService.getToken()
            )
            .subscribe((balance: any) => {
              this.user_wallet.available_balance = balance['credits'];
            });
        },
        (error) => {
          this.snackBar.open(
            'Error fetching user profile!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  ngOnInit() {
    this.viewProperties();
    this.refreshProperties();
  }

  addMoneyToWallet() {
    this.isAddMoneyDisabled = true;
    this.userProfileService
      .canAddMoney(this.userData.email, this.user_wallet.id, this.cookieService.getToken())
      .subscribe(
        (message) => {
          this.isAddMoneyDisabled = false;
          if (!this.isAddMoneyDisabled) {
            this.addMoneyResponseMessage = "";
            this.userProfileService
              .addMoneyToWallet(this.userData.email, this.user_wallet.id, this.cookieService.getToken())
              .subscribe((balance: any) => {
                this.user_wallet.available_balance = balance['credits'];
                this.userProfileService
                  .getWalletBalance(
                    this.userData.email,
                    this.user_wallet.id,
                    this.cookieService.getToken()
                  )
                  .subscribe((balance: any) => {
                    this.user_wallet.available_balance = balance['credits'];
                  });
              });
          }
        },
        (error) => {
          this.addMoneyResponseMessage = "Wait for more time to add money to wallet"
        }
      );
  }

  enableEditMode() {
    this.editMode = true;
  }

  saveChanges() {
    Object.keys(this.newUserData).forEach((key) => {
      if (this.userProfile.hasOwnProperty(key)) {
        this.userProfile[key] = this.newUserData[key];
      }
    });

    this.userProfileService
      .updateUserProfile(this.userProfile, this.cookieService.getToken())
      .subscribe(
        (message) => {
        },
        (error) => {
          this.snackBar.open(
            'Error fetching user profile!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
    this.editMode = false;
  }

  cancelEdit() {
    this.editMode = false;
  }

  onPropertyDocumentsSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      if (this.isPDFFile(file)) {
        this.newAddedDocument = file;
        this.responseMessage = 'File accepted';
      } else {
        this.responseMessage = 'Please select a valid PDF file.';
      }
    }
  }

  isPDFFile(file: File): boolean {
    const allowedTypes = ['application/pdf'];
    return allowedTypes.includes(file.type);
  }

  refreshProperties() {
    this.addMoneyResponseMessage = "";
    this.userProfileService
      .getAllUserProperties(this.userData.email, this.cookieService.getToken())
      .subscribe(
        (data) => {
          this.userProperties = data.all_properties.map((property: any) => {
            property.for_sale = this.convertStringToBool(property.for_sale);
            property.view_listing = this.convertStringToBool(
              property.view_listing
            );
            property.is_sold = this.convertStringToBool(property.is_sold);
            property.is_admin_verified = this.convertStringToBool(
              property.is_admin_verified
            );
            return property;
          });
          for (const property of this.userProperties) {
            this.userProfileService
              .getAllPropertyDocuments(
                this.userData.email,
                property.id,
                this.cookieService.getToken()
              )
              .subscribe(
                (data) => {
                  property['documents'] = data.all_documents.map(
                    (document: any) => {
                      const binaryData = atob(document.content);
                      const arrayBuffer = new ArrayBuffer(binaryData.length);
                      const uint8Array = new Uint8Array(arrayBuffer);
                      for (let i = 0; i < binaryData.length; i++) {
                        uint8Array[i] = binaryData.charCodeAt(i);
                      }
                      document.content = new Blob([uint8Array], {
                        type: 'application/pdf',
                      });

                      return document;
                    }
                  );
                },
                (error) => {
                  this.snackBar.open(
                    'Error fetching property documents!',
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
            'Error fetching user properties!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }
  // ADD DOCUMENT UPLOAD CODE HERE

  addProperty() {
    if (
      this.newProperty.name &&
      this.newProperty.price &&
      this.newProperty.location &&
      this.newProperty.type
    ) {
      if (
        (this.newProperty.type == 'Rent' &&
          this.newProperty.start_date &&
          this.newProperty.end_date) ||
        this.newProperty.type != 'Rent'
      ) {
        this.userProfileService
          .addUserProperty(
            this.userData.email,
            this.newProperty,
            this.cookieService.getToken()
          )
          .subscribe(
            (data) => {
              this.userProfile = data;

              this.viewProperties();
              this.refreshProperties();
              // Reset the form
              this.newProperty = {
                name: '',
                price: '',
                type: '',
                location: '',
                amenities: '',
                start_date: '',
                end_date: '',
              };
            },
            (error) => {
              this.snackBar.open(
                'Error adding property!',
                'Close',
                {
                  duration: 5000,
                }
              );
            }
          );

        
        this.showAddPropertyForm = false;
      }
    }
  }

  // one user can thave same named pproperties
  modifyProperty() {
    let property_id;
    let old_type;
    this.userProfileService
      .searchProperty(
        this.userData.email,
        this.userData.email,
        this.modifiedProperty.old_name,
        this.cookieService.getToken()
      )
      .subscribe(
        (data) => {
          property_id = data.property_id;
          old_type = data.for_sale;
          if (this.modifiedProperty.new_type) {
            old_type = this.modifiedProperty.new_type;
          }
          this.userProfileService
            .modifyUserProperty(
              old_type,
              this.userData.email,
              property_id.toString(),
              this.modifiedProperty,
              this.cookieService.getToken()
            )
            .subscribe(
              (data) => {
                this.userProfileService
                  .getAllUserProperties(
                    this.userData.email,
                    this.cookieService.getToken()
                  )
                  .subscribe(
                    (data) => {
                      this.userProperties = data.all_properties.map(
                        (property: any) => {
                          property.for_sale = this.convertStringToBool(
                            property.for_sale
                          );
                          property.view_listing = this.convertStringToBool(
                            property.view_listing
                          );
                          property.is_sold = this.convertStringToBool(
                            property.is_sold
                          );
                          return property;
                        }
                      );
                    },
                    (error) => {
                      this.snackBar.open(
                        'Error fetching property!',
                        'Close',
                        {
                          duration: 5000,
                        }
                      );
                    }
                  );
              },
              (error) => {
                this.snackBar.open(
                  'Error modifying property!!',
                  'Close',
                  {
                    duration: 5000,
                  }
                );
              }
            );
        },
        (error) => {
          this.snackBar.open(
            'Errror finding property!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  showDeleteVerification(propertyName: string) {
    this.otpVerificationVisible = true;
    this.deletedProperty.name = propertyName;
    this.deleteButtonsDisabled = true;

    this.userProfileService
      .searchProperty(
        this.userData.email,
        this.userData.email,
        this.deletedProperty.name,
        this.cookieService.getToken()
      )
      .subscribe(
        (data) => {

          this.userProfileService
            .sendVerificationMail(this.userData.email)
            .subscribe(
              (data: any) => {
                this.deleteVerificationCode = data['verification_code'];
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
        },
        (error) => {
          this.snackBar.open(
            'Property not found!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  deleteProperty(propertyName?: string) {
    if (propertyName) {
      this.deletedProperty.name = propertyName;
    }

    if (this.otpVerificationVisible) {
      // Check if the OTP is verified, and enable or disable delete buttons accordingly
      if (this.deletePopUpInput === this.deleteVerificationCode) {
        this.deleteConfirmationMessage = 'Deleting...';
        this.deleteConfirmationMessageClass = 'success-message';

        this.userProfileService
          .searchProperty(
            this.userData.email,
            this.userData.email,
            this.deletedProperty.name,
            this.cookieService.getToken()
          )
          .subscribe(
            (data) => {
              const property_id = data.property_id;
              this.userProfileService
                .deleteUserProperty(
                  this.userData.email,
                  property_id.toString(),
                  this.cookieService.getToken()
                )
                .subscribe(
                  (response) => {
                    this.viewProperties();
                    this.refreshProperties();
                  },
                  (error) => {
                    this.snackBar.open(
                      'Error deleting property!',
                      'Close',
                      {
                        duration: 5000,
                      }
                    );
                  }
                );
            },
            (error) => {
              this.snackBar.open(
                'Error finding property!',
                'Close',
                {
                  duration: 5000,
                }
              );
            }
          );

        setTimeout(() => {
          this.deleteConfirmationMessage = '';
          this.deletePopUpInput = '';
          this.deleteConfirmationMessageClass = '';
          this.otpVerificationVisible = false;
          this.deleteButtonsDisabled = false;
        }, 100); // 1 second
      } else {
        this.deleteConfirmationMessage = 'Incorrect input. Please try again.';
        this.deleteConfirmationMessageClass = 'error-message';
        this.deleteVerificationCode = 'cdjdoyk';

        setTimeout(() => {
          this.deleteConfirmationMessage = '';
          this.deletePopUpInput = '';
          this.deleteConfirmationMessageClass = '';
          this.otpVerificationVisible = false;
          this.deleteButtonsDisabled = false;
        }, 100);
      }
    } else {
      // If OTP verification is not visible, show OTP verification input box and disable delete buttons
      this.otpVerificationVisible = true;
      this.deleteButtonsDisabled = true;
    }
  }

  showAddDocumentForm(propertyName: string) {
    this.UploadDocumentButtonVisible = true;
    this.addDocumentProperty.name = propertyName;
    this.addDocumentButtonsDisabled = true;
  }

  addDocumentToProperty(propertyName: string) {
    let property_id;
    this.userProfileService
      .searchProperty(
        this.userData.email,
        this.userData.email,
        propertyName,
        this.cookieService.getToken()
      )
      .subscribe(
        (data) => {
          property_id = data.property_id;

          this.userProfileService
            .addPropertyDocument(
              this.userData.email,
              property_id,
              this.privateKeyInput,
              this.newAddedDocument,
              this.cookieService.getToken()
            )
            .subscribe(
              (data) => {
                this.viewProperties();
                this.refreshProperties();

                this.UploadDocumentButtonVisible = false;
                this.addDocumentButtonsDisabled = false;
                this.privateKeyInput = '';
                this.showInPopUp('Document added');
              },
              (error) => {
                this.UploadDocumentButtonVisible = false;
                this.addDocumentButtonsDisabled = false;
                this.privateKeyInput = '';
                this.showInPopUp('Document could NOT be added');
              }
            );
        },
        (error) => {
          this.snackBar.open(
            'Could not find property!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  deleteDocumentFromProperty(documentId: string) {

    this.userProfileService
      .deletePropertyDocument(
        this.userData.email, 
        documentId, this.cookieService.getToken())
      .subscribe(
        (data) => {
        },
        (error) => {
          this.snackBar.open(
            'Could not delete document!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
    this.viewProperties();
    this.refreshProperties();
  }

  toggleViewListing(propertyName: string) {
    let property_id;
    this.userProfileService
      .searchProperty(
        this.userData.email,
        this.userData.email,
        propertyName,
        this.cookieService.getToken()
      )
      .subscribe(
        (data) => {
          property_id = data.property_id;
          this.userProfileService
            .toggleViewListing(
              this.userData.email,
              property_id.toString(),
              this.cookieService.getToken()
            )
            .subscribe(
              (value) => {
                this.refreshProperties();
                // this.userProfileService
                //   .getAllUserProperties(
                //     this.userData.email,
                //     this.cookieService.getToken()
                //   )
                //   .subscribe(
                //     (data) => {
                //       this.userProperties = data.all_properties.map(
                //         (property: any) => {
                //           property.for_sale = this.convertStringToBool(
                //             property.for_sale
                //           );
                //           property.view_listing = this.convertStringToBool(
                //             property.view_listing
                //           );
                //           return property;
                //         }
                //       );
                //     },
                //     (error) => {
                //       this.snackBar.open(
                //         'Error toggling view listing!',
                //         'Close',
                //         {
                //           duration: 5000,
                //         }
                //       );
                //     }
                //   );
              },
              (error) => {
                this.snackBar.open(
                  'Error toggling view listing!',
                  'Close',
                  {
                    duration: 5000,
                  }
                );
              }
            );
        },
        (error) => {
          this.snackBar.open(
            'Error finding user properties!',
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
        (response: any) => {
          this.responseMessage = response.message;
        },
        (error: any) => {
          this.responseMessage = 'Redirecting error';
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

  showInterestedParties() {
    this.router.navigate([
      '/show-my-contracts',
      {
        email: this.userData.email,
        password: this.userData.password,
        access_token: this.cookieService.getToken(),
      },
    ]);
  }

  showPastHistory() {
    this.router.navigate([
      '/show-past-history',
      {
        email: this.userData.email,
        password: this.userData.password,
        access_token: this.cookieService.getToken(),
      },
    ]);
  }

  showPropertiesYouAreIntrestedIn() {
    this.router.navigate([
      '/ongoing-contracts-for-buyer',
      {
        email: this.userData.email,
        password: this.userData.password,
        access_token: this.cookieService.getToken(),
      },
    ]);
  }

  convertStringToBool(value: string) {
    if (value === 'True') {
      return true;
    } else {
      return false;
    }
  }

  showInPopUp(message: string) {
    this.messagePopupText = message;
    if (this.canShowPopUp) {
      this.showPopupElement();
    }
  }

  downloadPdfWithContent(property_document_content: File) {
    const url = window.URL.createObjectURL(property_document_content);
    window.open(url);
  }

  showPopupElement() {
    this.showMessagePopup = true;
    this.messagePopUpCountdown = 3;
    this.updateTimer();
  }


  hidePopup() {
    this.showMessagePopup = false;
    this.canShowPopUp = false;
    clearTimeout(this.timer);
  }

  updateTimer() {
    if (this.messagePopUpCountdown === 0) {
      this.hidePopup();
    } else {
      this.messagePopUpCountdown--;
      this.timer = setTimeout(() => this.updateTimer(), 1000);
    }
  }
}
