// home-page.component.ts

import { Component, OnInit } from '@angular/core';
import { HomePageService } from '../services/home-page.service';
import { ContractService } from '../services/contract.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CookieStorageService } from '../services/cookie-storage.service';
import { UserProfileService } from '../services/user-profile.service';
import { MatSnackBar } from '@angular/material/snack-bar';


@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
})
export class HomePageComponent implements OnInit {
  contractToSign: any;
  userData: any;
  responseMessage: string = '';

  filterType: string = '';
  filterMinValue: string = '';
  filterMaxValue: string = '';
  filterLocation: string = '';
  filterAmenities: string = '';
  filterStartDate: string = '';
  filterEndDate: string = '';
  cannotCreateContract: boolean = false;

  filteredProperties: any[] = [];

  constructor(
    private homePageService: HomePageService,
    private route: ActivatedRoute,
    private router: Router,
    private contractService: ContractService,
    private cookieService: CookieStorageService,
    private userProfileService: UserProfileService,
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

  ngOnInit() {
    this.homePageService
      .getUsersWithProperties(
        this.userData.email,
        this.cookieService.getToken()
      )
      .subscribe(
        (data: any[]) => {
          this.filteredProperties = data;
        },
        (error: any) => {
          this.snackBar.open(
            'Could not fetch data from server!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  reloadPage() {
    window.location.reload();
  }


  toggleDropdown(property: any) {
    property.showDropdown = !property.showDropdown;
  }

  reportUser(ownerEmail: string) {
    this.homePageService
      .reportUser(
        this.userData.email,
        ownerEmail,
        this.cookieService.getToken()
      )
      .subscribe(
        (response: any) => {
          this.responseMessage = response.message;
          this.snackBar.open(
            response.message,
            'Close',
            {
              duration: 5000,
            }
          );
        },
        (error: any) => {
          this.responseMessage = 'Redirecting error';
          this.snackBar.open(
            'Unable to access API',
            'Close',
            {
              duration: 5000,
            }
          );

        }
      );
  }

  reportProperty(propertyId: string) {
    this.homePageService
      .reportProperty(
        this.userData.email,
        propertyId,
        this.cookieService.getToken()
      )
      .subscribe(
        (response: any) => {
          this.responseMessage = response.message;
          this.snackBar.open(
            'Reported property!',
            'Close',
            {
              duration: 5000,
            }
          );
        },
        (error: any) => {
          this.responseMessage = 'Redirecting error';
          this.snackBar.open(
            'Unable to report',
            'Close',
            {
              duration: 5000,
            }
          );

        }
      );
  }

  gotToUserProfile() {
    this.homePageService
      .goToUserProfile(
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
            'Could not find user profile',
            'Close',
            {
              duration: 5000,
            }
          );

        }
      );
  }

  applyFilters() {
    const filters = {
      filterType: this.filterType,
      filterMinValue: this.filterMinValue.toString(),
      filterMaxValue: this.filterMaxValue.toString(),
      filterLocation: this.filterLocation,
      filterAmenities: this.filterAmenities,
      filterStartDate: this.filterStartDate,
      filterEndDate: this.filterEndDate,
    };
    this.homePageService
      .getFilteredProperties(
        this.userData.email,
        filters,
        this.cookieService.getToken()
      )
      .subscribe(
        (data: any[]) => {
          this.filteredProperties = data;
        },
        (error: any) => {
          this.snackBar.open(
            'Error fetching data from server',
            'Close',
            {
              duration: 5000,
            }
          );

        }
      );
  }

  clearFilters() {
    // Reset all filters
    this.filterType = '';
    this.filterMinValue = '';
    this.filterMaxValue = '';
    this.filterLocation = '';
    this.filterAmenities = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.homePageService
    .getUsersWithProperties(
      this.userData.email,
      this.cookieService.getToken()
    )
    .subscribe(
      (data: any[]) => {
        this.filteredProperties = data;
      },
      (error: any) => {
        this.snackBar.open(
          'Could not fetch data from server!',
          'Close',
          {
            duration: 5000,
          }
        );
      }
    );
    
  }

  buyRentProperty(property: any) {
    let property_id;
    this.userProfileService
      .searchProperty(
        this.userData.email,
        property.owner_email,
        property.name,
        this.cookieService.getToken()
      )
      .subscribe(
        (data: any) => {
          const sendToContract = {
            property_id: data.property_id,
            property_name: property.name,
            property_location: property.location,
            property_value: property.price,
            for_sale: property.for_sale,
            property_amenities: property.amenities,
            property_toDate: property.end_date,
            property_fromDate: property.start_date,
            buyer_email: this.userData.email,
            password: this.userData.password,
            email: this.userData.email,
            seller_email: property.owner_email,
          };
          const checkForProperty = {
            property_id: data.property_id,
            buyer_email: this.userData.email,
            seller_email: property.owner_email,
          };
          this.contractService
            .checkContractExists(
              this.userData.email,
              checkForProperty,
              this.cookieService.getToken()
            )
            .subscribe(
              (data: any) => {
                if (!data.contract_exists) {
                  this.contractService
                    .createContract(
                      this.userData.email,
                      sendToContract,
                      this.cookieService.getToken()
                    )
                    .subscribe(
                      (data) => {
                        this.contractToSign = data;
                        this.contractToSign['password'] =
                          this.userData.password;
                        this.contractToSign['email'] = this.userData.email;
                        this.contractToSign['access_token'] =
                          this.cookieService.getToken();
                        this.router.navigate([
                          '/create-contract',
                          this.contractToSign,
                        ]);
                      },
                      (error) => {
                        this.snackBar.open(
                          'Contract could not be created',
                          'Close',
                          {
                            duration: 5000,
                          }
                        );
      
                      }
                    );
                } else {
                  // Show a pop up
                  this.snackBar.open(
                    'The contract for this property has already been generated by you.',
                    'Close',
                    {
                      duration: 5000, // Adjust the duration as needed
                    }
                  );
                }
              },
              (error) => {
                this.snackBar.open(
                  'Could not find property',
                  'Close',
                  {
                    duration: 5000,
                  }
                );

              }
            );
      },
      (error: any) => {
        this.snackBar.open(
          'Owner might have removed this property',
          'Close',
          {
            duration: 5000,
          }
        );

      }
    );
  }
}
