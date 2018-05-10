import { NgModule } from '@angular/core';
import { NgxOnboardingComponent } from './ngx-onboarding.component';
import { ManagerComponent } from './components/manager/manager.component';

@NgModule({
  imports: [
  ],
  declarations: [NgxOnboardingComponent, ManagerComponent],
  exports: [NgxOnboardingComponent]
})
export class NgxOnboardingModule { }
