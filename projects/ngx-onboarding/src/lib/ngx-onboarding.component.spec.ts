import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxOnboardingComponent } from './ngx-onboarding.component';

describe('NgxOnboardingComponent', () => {
  let component: NgxOnboardingComponent;
  let fixture: ComponentFixture<NgxOnboardingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxOnboardingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxOnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
