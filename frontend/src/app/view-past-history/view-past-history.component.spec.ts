import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewPastHistoryComponent } from './view-past-history.component';

describe('ViewPastHistoryComponent', () => {
  let component: ViewPastHistoryComponent;
  let fixture: ComponentFixture<ViewPastHistoryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ViewPastHistoryComponent]
    });
    fixture = TestBed.createComponent(ViewPastHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
