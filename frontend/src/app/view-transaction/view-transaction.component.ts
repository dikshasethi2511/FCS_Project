import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CookieStorageService } from '../services/cookie-storage.service';
import { Router } from '@angular/router';
import { AdminProfileService } from '../services/admin-profile.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-view-transaction',
  templateUrl: './view-transaction.component.html',
  styleUrls: ['./view-transaction.component.css'],
})
export class ViewTransactionComponent {
  transactions: any;
  email: string = '';
  password: string = '';

  constructor(
    private route: ActivatedRoute,
    private cookieService: CookieStorageService,
    private router: Router,
    private adminProfileService: AdminProfileService,
    private snackBar: MatSnackBar
  ) {
    this.route.params.subscribe((params) => {
      this.transactions = params['transactions'];
      this.cookieService.setToken(params['access_token']);
      this.email = params['email'];
      this.password = params['password'];
    });
  }

  ngOnInit() {
    this.adminProfileService
      .viewTransactions(
        this.email,
        this.password,
        this.cookieService.getToken()
      )
      .subscribe(
        (data: any[]) => {
          this.transactions = data;
        },
        (error: any) => {
          this.snackBar.open(
            'Error viewing transactions',
            'Close',
            {
              duration: 5000,
            }
          );
        }
      );
  }

  goToAdminProfile(){
    this.router.navigate([
      '/admin-profile',
      { email: this.email, password: this.password, access_token: this.cookieService.getToken() },
    ]);
  }
}
