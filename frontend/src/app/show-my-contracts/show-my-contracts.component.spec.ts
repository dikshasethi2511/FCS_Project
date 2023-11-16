import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowMyContractsComponent } from './show-my-contracts.component';

describe('ShowMyContractsComponent', () => {
  let component: ShowMyContractsComponent;
  let fixture: ComponentFixture<ShowMyContractsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ShowMyContractsComponent]
    });
    fixture = TestBed.createComponent(ShowMyContractsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
