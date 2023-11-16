import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthComponent } from './auth/auth.component';
import { AuthService } from './services/auth.service';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { HomePageComponent } from './home-page/home-page.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminProfileComponent } from './admin-profile/admin-profile.component';
import { ContractComponent } from './contract/contract.component';
import { ShowMyContractsComponent } from './show-my-contracts/show-my-contracts.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ViewPastHistoryComponent } from './view-past-history/view-past-history.component';
import { PayForPaymentsComponent } from './pay-for-payments/pay-for-payments.component';
import { OngoingContractsForBuyerComponent } from './ongoing-contracts-for-buyer/ongoing-contracts-for-buyer.component';
import { ViewTransactionComponent } from './view-transaction/view-transaction.component';

@NgModule({
  declarations: [
    AppComponent,
    AuthComponent,
    UserProfileComponent,
    HomePageComponent,
    AdminLoginComponent,
    AdminProfileComponent,
    ContractComponent,
    ShowMyContractsComponent,
    ViewPastHistoryComponent,
    PayForPaymentsComponent,
    OngoingContractsForBuyerComponent,
    ViewTransactionComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    MatDatepickerModule,
    BrowserAnimationsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  providers: [AuthService],
  bootstrap: [AppComponent],
})
export class AppModule {}
