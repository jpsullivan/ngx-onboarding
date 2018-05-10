import { TestBed, inject } from '@angular/core/testing';

import { NgxOnboardingService } from './ngx-onboarding.service';

describe('NgxOnboardingService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgxOnboardingService]
    });
  });

  it('should be created', inject([NgxOnboardingService], (service: NgxOnboardingService) => {
    expect(service).toBeTruthy();
  }));
});
