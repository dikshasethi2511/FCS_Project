import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OngoingContractsForBuyerComponent } from './ongoing-contracts-for-buyer.component';

describe('OngoingContractsForBuyerComponent', () => {
  let component: OngoingContractsForBuyerComponent;
  let fixture: ComponentFixture<OngoingContractsForBuyerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OngoingContractsForBuyerComponent]
    });
    fixture = TestBed.createComponent(OngoingContractsForBuyerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
