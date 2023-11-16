import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { SHA256 } from 'crypto-js';
import { Router } from '@angular/router';
import { CookieStorageService } from '../services/cookie-storage.service';
import { MatSnackBar } from '@angular/material/snack-bar';
@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
})
export class AuthComponent {
  showLogin: boolean = false;
  responseMessage: string = '';
  verificationFormDisabled: boolean = false;
  privateKey: string = '';
  publicKey: string = '';

  loginData = {
    email: '',
    password: '',
  };

  registerData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
    ekyc_password: '',
  };

  walletCredentials = { id: '', password: '' };

  showVerificationInput: boolean = false;
  userVerificationCode: string = 'egsyrjqp';

  showPopup: boolean = false;
  popupText: string = '';
  canShowPopUp: boolean = true;

  countdown: number = 15;
  private timer: any;

  private selectedFile: any;
  messagePopupText: string = '';

  constructor(
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router,
    private cookieService: CookieStorageService
  ) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      this.selectedFile = file;
      this.responseMessage = '';
    }
  }

  validatePassword(password: string): boolean {
    // Check if the password length is between 8 and 15 characters.
    if (password.length < 8 || password.length > 15) {
      this.responseMessage = 'Password must be between 8 and 15 characters.';
      return false;
    }

    // Check if the password contains at least one symbol, one capital letter, and one number.
    const symbolRegex = /[-!$%^&*()_+|~=`{}\[\]:";'<>?,.\/@#]/;
    const capitalRegex = /[A-Z]/;
    const numberRegex = /[0-9]/;

    if (
      !symbolRegex.test(password) ||
      !capitalRegex.test(password) ||
      !numberRegex.test(password)
    ) {
      this.responseMessage =
        'Password must contain at least one symbol, one capital letter, and one number.';
      return false;
    }
    this.responseMessage = '';
    return true;
  }

  onLoginClick() {
    this.showLogin = true;
    this.responseMessage = '';
  }

  onSignUpClick() {
    this.showLogin = false;
    this.responseMessage = '';
  }

  async showInPopUp(message: string) {
    this.popupText = message;
    if (this.canShowPopUp) {
      this.showPopupElement();
    }
  }

  register() {
    if (!this.showVerificationInput) {
      if (!this.registerData.email) {
        this.responseMessage = 'Please enter an Email Address';
        return;
      }
      this.authService.checkEmailExists(this.registerData.email).subscribe(
        (response: any) => {
          if (response.exists) {
            this.responseMessage =
              'Email already exists. Please use a different email.';
          } else {
            if (!this.validatePassword(this.registerData.password)) {
              return;
            }
            this.showVerificationInput = true;
            this.verificationFormDisabled = true;
            this.authService
              .sendVerificationMail(this.registerData.email)
              .subscribe(
                (data: any) => {
                  this.userVerificationCode = data['verification_code'];
                },
                (error: any) => {
                  this.snackBar.open("Failed to send verification",'Close',{duration: 5000,});
                }
              );
          }
        },
        (error: any) => {
          this.snackBar.open(error,'Close',{duration: 5000,});
        }
      );
      return;
    }
    
    if (
      this.registerData.name &&
      this.registerData.email &&
      this.registerData.password &&
      this.registerData.confirmPassword &&
      this.registerData.password === this.registerData.confirmPassword &&
      this.selectedFile &&
      this.registerData.ekyc_password &&
      this.registerData.verificationCode === this.userVerificationCode
    ) {
      const hashedPassword = SHA256(this.registerData.password).toString();

      this.authService.getKeyPair().subscribe(
        async (response: any) => {
          this.privateKey = response['private_key_pem'];
          this.publicKey = response['public_key_pem'];

          try {
            const wallet: any = await this.authService
              .generateWallet()
              .toPromise();
            this.walletCredentials.id = wallet['wallet_id'];
            this.walletCredentials.password = wallet['wallet_password'];
          } catch (error) {
            this.snackBar.open("Error generating wallet",'Close',{duration: 5000,});
          }

          this.authService
            .register(
              this.registerData.name,
              this.registerData.email,
              hashedPassword,
              this.selectedFile,
              this.publicKey,
              this.registerData.verificationCode,
              this.userVerificationCode,
              this.registerData.ekyc_password,
              this.walletCredentials.id
            )
            .subscribe(
              async (response: any) => {
                this.responseMessage = response.message;
                setTimeout(() => this.showInPopUp("Wallet ID: " + this.walletCredentials.id + " Wallet Password: " + this.walletCredentials.password), 10);
                setTimeout(() => this.showInPopUp("Private Key: " + this.privateKey), 15000);
              },
              (error: any) => {
                this.responseMessage = error.message;
                this.snackBar.open(error,'Close',{duration: 5000,});
                this.userVerificationCode = 'djolwqcan';
              }
            );
        },
        (error: any) => {
          this.responseMessage = error.message;
          this.snackBar.open("error generating key",'Close',{duration: 5000,});
        }
      );
    } else {
      this.responseMessage =
        'Registration failed. Please fill in all fields and ensure passwords match.';
    }
  }

  logIn() {
    this.responseMessage = '';
    if (this.loginData.email && this.loginData.password) {
      const hashedPassword = SHA256(this.loginData.password).toString(); // Convert the hash to a string
      this.authService.logIn(this.loginData.email, hashedPassword).subscribe(
        (response: any) => {
          this.responseMessage = response.token;
      
        },
        (error: any) => {
          this.responseMessage = 'Log-in error';
          this.snackBar.open("Log-In Error",'Close',{duration: 5000,});
        }
      );
    } else {
      this.responseMessage = 'Login failed. Please fill all the fields!';
    }
  }

  adminLogin() {
    // Navigate to "admin-login"
    this.router.navigate(['/admin-login']);
  }

  showPopupElement() {
    this.showPopup = true;
    this.countdown = 15;
    this.updateTimer();
  }

  hidePopup() {
    this.showPopup = false;
    this.canShowPopUp = false;
    clearTimeout(this.timer);
  }

  updateTimer() {
    if (this.countdown === 0) {
      this.hidePopup();
    } else {
      this.countdown--;
      this.timer = setTimeout(() => this.updateTimer(), 1000);
    }
  }
}
