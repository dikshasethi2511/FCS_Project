import { Component } from '@angular/core';
import { AdminProfileService } from '../services/admin-profile.service';
import { SHA256 } from 'crypto-js';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css'],
})
export class AdminLoginComponent {
  responseMessage: string = '';

  loginData = {
    email: '',
    password: '',
  };

  constructor(private adminProfileService: AdminProfileService, private router: Router) {}

  logIn() {
    this.responseMessage = '';
    if (this.loginData.email && this.loginData.password) {
      const hashedPassword = SHA256(this.loginData.password).toString();
      this.adminProfileService
        .adminLogin(this.loginData.email, hashedPassword)
        .subscribe(
          (response: any) => {
            this.responseMessage = response.message;
          },
          (error: any) => {
            this.responseMessage = "Please fill all fileds and ensure password is correct!";
          }
        );
    } else {
      this.responseMessage = 'Login failed. Please fill all the fields!';
    }
  }

  returnBack() {
    this.router.navigate(['/user-register']);
  }
}
