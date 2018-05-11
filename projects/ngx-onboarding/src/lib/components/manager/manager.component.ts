import {
  Component,
  OnInit,
  Input,
  AfterContentInit,
  Optional,
  ChangeDetectorRef,
  Output,
  EventEmitter
} from '@angular/core';
import { AnimationEvent } from '@angular/animations';
import { CdkStepper, StepContentPositionState } from '@angular/cdk/stepper';
import { Select, Store } from '@ngxs/store';
import { Directionality } from '@angular/cdk/bidi';

@Component({
  selector: 'obd-manager',
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.css']
})
export class ManagerComponent extends CdkStepper implements OnInit, AfterContentInit {
  /**
   * For toggling the overlay "blanket" transparency
   * @type {boolean}
   */
  @Input() overlayIsTinted = true;

  /**
   * Typically the app, or a section of the app.
   * @type {Node}
   */
  @Input() children: Node;

  /**
   * Event emitted when the current step is done transitioning in.
   * @type {EventEmitter<void>}
   */
  @Output() readonly animationDone: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private store: Store,
    @Optional() dir: Directionality,
    changeDetectorRef: ChangeDetectorRef
  ) {
    super(dir, changeDetectorRef);
  }

  ngOnInit() {}

  ngAfterContentInit(): void {}

  /**
   * @param event
   */
  animationDoneHandler(event: AnimationEvent) {
    if ((event.toState as StepContentPositionState) === 'current') {
      this.animationDone.emit();
    }
  }
}
