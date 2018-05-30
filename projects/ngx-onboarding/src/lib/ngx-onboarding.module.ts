import { NgModule } from '@angular/core';
import { NgxOnboardingComponent } from './ngx-onboarding.component';
import { ManagerComponent } from './components/manager/manager.component';
import { TargetDirective } from './directives/target/target.directive';
import { SpotlightComponent } from './components/spotlight/spotlight.component';
import { SpotlightContentDirective } from './directives/spotlight-content/spotlight-content.directive';

@NgModule({
  imports: [],
  declarations: [NgxOnboardingComponent, ManagerComponent, TargetDirective, SpotlightComponent, SpotlightContentDirective],
  exports: [NgxOnboardingComponent]
})
export class NgxOnboardingModule {}
