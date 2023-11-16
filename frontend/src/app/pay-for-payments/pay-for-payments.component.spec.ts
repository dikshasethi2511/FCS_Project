import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayForPaymentsComponent } from './pay-for-payments.component';

describe('PayForPaymentsComponent', () => {
  let component: PayForPaymentsComponent;
  let fixture: ComponentFixture<PayForPaymentsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PayForPaymentsComponent]
    });
    fixture = TestBed.createComponent(PayForPaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
