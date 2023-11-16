import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthComponent } from './auth/auth.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { HomePageComponent } from './home-page/home-page.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminProfileComponent } from './admin-profile/admin-profile.component';
import { ContractComponent } from './contract/contract.component';
import { ShowMyContractsComponent } from './show-my-contracts/show-my-contracts.component';
import { ViewPastHistoryComponent } from './view-past-history/view-past-history.component';
import { OngoingContractsForBuyerComponent } from './ongoing-contracts-for-buyer/ongoing-contracts-for-buyer.component';
import { PayForPaymentsComponent } from './pay-for-payments/pay-for-payments.component';
import { ViewTransactionComponent } from './view-transaction/view-transaction.component';

const routes: Routes = [
  { path: '', redirectTo: '/user-register', pathMatch: 'full' },
  { path: 'user-register', component: AuthComponent },
  { path: 'user-profile', component: UserProfileComponent },
  { path: 'home-page', component: HomePageComponent },
  { path: 'admin-login', component: AdminLoginComponent },
  { path: 'admin-profile', component: AdminProfileComponent },
  { path: 'create-contract', component: ContractComponent },
  { path: 'show-my-contracts', component: ShowMyContractsComponent },
  { path: 'show-past-history', component: ViewPastHistoryComponent },
  { path: 'view-transaction', component: ViewTransactionComponent },
  
  {
    path: 'ongoing-contracts-for-buyer',
    component: OngoingContractsForBuyerComponent,
  },
  { path: 'pay-for-payments', component: PayForPaymentsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
