import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminProfileService } from '../services/admin-profile.service';
import { AuthService } from '../services/auth.service';
import { CookieStorageService } from '../services/cookie-storage.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-profile',
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.css'],
})
export class AdminProfileComponent {
  adminData: any;
  adminProfile: any = {};
  users: any = [];
  properties: any = [];
  isViewingUsers: boolean = true;

  constructor(
    private adminProfileService: AdminProfileService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private cookieService: CookieStorageService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.route.params.subscribe((params) => {
      this.adminData = params;
      this.cookieService.setToken(this.adminData.access_token);
      this.adminData = Object.keys(this.adminData).reduce((acc: any, key) => {
        if (key !== 'access_token') {
          acc[key] = this.adminData[key];
        }
        return acc;
      }, {});
    });
  }

  ngOnInit() {
    this.viewUsers();
  }

  downloadPdfWithContent(property_document_content: File) {
    const url = window.URL.createObjectURL(property_document_content);
    window.open(url);
  }

  deleteDocumentFromProperty(documentId: string) {
    this.adminProfileService
      .deletePropertyDocument(this.adminData.email, documentId, this.cookieService.getToken())
      .subscribe(
        (data) => {
          this.snackBar.open(
            'Property documents deleted!',
            'Close',
            {
              duration: 5000,
            }
          );
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
  }

  viewUsers() {
    this.adminProfileService
      .getAllUsers(
        this.adminData.email,
        this.adminData.password,
        this.cookieService.getToken()
      )
      .subscribe(
        (data: any) => {
          this.users = data;
          this.isViewingUsers = true;
        },
        (error: any) => {
          this.snackBar.open(
            'Unauthorised',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  convertStringToBool(value: string) {
    if (value === 'True') {
      return true;
    } else {
      return false;
    }
  }

  viewProperties() {
    this.adminProfileService
      .getAllProperties(
        this.adminData.email,
        this.adminData.password,
        this.cookieService.getToken()
      )
      .subscribe(
        (data: any) => {
          this.properties = data.all_properties.map((property: any) => {
            property.for_sale = this.convertStringToBool(property.for_sale);
            property.view_listing = this.convertStringToBool(
              property.view_listing
            );
            property.is_sold = this.convertStringToBool(property.is_sold);

            return property;
          });
          for (const property of this.properties) {
            this.adminProfileService
              .getAllPropertyDocuments(
                this.adminData.email,
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
                    'Unauthorized',
                    'Close',
                    {
                      duration: 5000,
                    }
                  );
                }
              );
          }

          this.isViewingUsers = false;
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

  deleteUser(toDeleteEmail: string) {
    this.adminProfileService
      .deleteUser(
        this.adminData.email,
        this.adminData.password,
        toDeleteEmail,
        this.cookieService.getToken()
      )
      .subscribe(
        (data: any[]) => {
          this.viewUsers();
        },
        (error: any) => {
          this.snackBar.open(
            'Error deleting user data!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  verifyAllPropertyDocuments(property_id: string) {
    this.adminProfileService
      .verifyPropertyDocuments(this.adminData.email, property_id, this.cookieService.getToken())
      .subscribe(
        (data: any[]) => {},
        (error: any) => {
          this.snackBar.open(
            'Error verifying user data!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  deleteProperty(property_id: string) {
    this.adminProfileService
      .deleteProperty(
        this.adminData.email,
        this.adminData.password,
        property_id,
        this.cookieService.getToken()
      )
      .subscribe(
        (data: any[]) => {
          this.viewProperties();
        },
        (error: any) => {
          this.snackBar.open(
            'Error deleting user property!',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  viewTransactions() {
    this.router.navigate([
      '/view-transaction',
      {
        email: this.adminData.email,
        password: this.adminData.password,
        access_token: this.cookieService.getToken(),
      },
    ]);
  }

  toggleView() {
    if (this.isViewingUsers) {
      this.viewProperties();
    } else {
      this.viewUsers();
    }
  }
}
