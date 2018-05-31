import { FocusKeyManager, FocusOrigin } from '@angular/cdk/a11y';
import { Direction } from '@angular/cdk/bidi';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ESCAPE, LEFT_ARROW, RIGHT_ARROW, DOWN_ARROW, UP_ARROW } from '@angular/cdk/keycodes';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Inject,
  InjectionToken,
  Input,
  NgZone,
  OnDestroy,
  Output,
  TemplateRef,
  QueryList,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { merge, Observable, Subject, Subscription } from 'rxjs';
import { startWith, switchMap, take } from 'rxjs/operators';
import { spotlightAnimations } from '../../models/spotlight-animations';
import { SpotlightContentDirective } from '../../directives/spotlight-content';
import {
  throwSpotlightInvalidPositionX,
  throwSpotlightInvalidPositionY
} from '../../models/spotlight-errors';
import { OBD_SPOTLIGHT_PANEL, SpotlightPanel } from '../../models/spotlight-panel';
import { SpotlightPositionX, SpotlightPositionY } from '../../models/spotlight-positions';
import { AnimationEvent } from '@angular/animations';

/**
 * Default `obd-spotlight` options that can be overridden.
 */
export interface SpotlightDefaultOptions {
  /** The x-axis position of the spotlight. */
  xPosition: SpotlightPositionX;

  /** The y-axis position of the spotlight. */
  yPosition: SpotlightPositionY;

  /** Whether the spotlight should overlap the spotlight trigger. */
  overlapTrigger: boolean;

  /** Class to be applied to the spotlight's backdrop. */
  backdropClass: string;

  /** Whether the spotlight has a backdrop. */
  hasBackdrop?: boolean;
}

/** Injection token to be used to override the default options for `obd-spotlight`. */
export const SPOTLIGHT_DEFAULT_OPTIONS = new InjectionToken<SpotlightDefaultOptions>(
  'obd-spotlight-default-options',
  {
    providedIn: 'root',
    factory: SPOTLIGHT_DEFAULT_OPTIONS_FACTORY
  }
);

/** @docs-private */
export function SPOTLIGHT_DEFAULT_OPTIONS_FACTORY(): SpotlightDefaultOptions {
  return {
    overlapTrigger: true,
    xPosition: 'after',
    yPosition: 'below',
    backdropClass: 'cdk-overlay-transparent-backdrop'
  };
}
/**
 * Start elevation for the spotlight panel.
 * @docs-private
 */
const OBD_SPOTLIGHT_BASE_ELEVATION = 2;

@Component({
  selector: 'obd-spotlight',
  templateUrl: 'spotlight.component.html',
  styleUrls: ['spotlight.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'obdSpotlight',
  animations: [spotlightAnimations.transformMenu, spotlightAnimations.fadeInItems],
  providers: [{ provide: OBD_SPOTLIGHT_PANEL, useExisting: Spotlight }]
})
export class Spotlight implements AfterContentInit, SpotlightPanel, OnDestroy {
  private _keyManager: FocusKeyManager<any>;
  private _xPosition: SpotlightPositionX = this._defaultOptions.xPosition;
  private _yPosition: SpotlightPositionY = this._defaultOptions.yPosition;
  private _previousElevation: string;

  /** Subscription to tab events on the spotlight panel */
  private _tabSubscription = Subscription.EMPTY;

  /** Config object to be passed into the spotlight's ngClass */
  _classList: { [key: string]: boolean } = {};

  /** Current state of the panel animation. */
  _panelAnimationState: 'void' | 'enter' = 'void';

  /** Emits whenever an animation on the spotlight completes. */
  _animationDone = new Subject<AnimationEvent>();

  /** Whether the spotlight is animating. */
  _isAnimating: boolean;

  /** Layout direction of the menu. */
  direction: Direction;

  /** Class to be added to the backdrop element. */
  @Input() backdropClass: string = this._defaultOptions.backdropClass;

  /** Position of the menu in the X axis. */
  @Input()
  get xPosition(): SpotlightPositionX {
    return this._xPosition;
  }
  set xPosition(value: SpotlightPositionX) {
    if (value !== 'before' && value !== 'after') {
      throwSpotlightInvalidPositionX();
    }
    this._xPosition = value;
  }

  /** Position of the spotlight in the Y axis. */
  @Input()
  get yPosition(): SpotlightPositionY {
    return this._yPosition;
  }
  set yPosition(value: SpotlightPositionY) {
    if (value !== 'above' && value !== 'below') {
      throwSpotlightInvalidPositionY();
    }
    this._yPosition = value;
  }

  /** @docs-private */
  @ViewChild(TemplateRef) templateRef: TemplateRef<any>;

  /**
   * Spotlight content that will be rendered lazily.
   * @docs-private
   */
  @ContentChild(SpotlightContentDirective) lazyContent: SpotlightContentDirective;

  /** Whether the spotlight should overlap its trigger. */
  @Input()
  get overlapTrigger(): boolean {
    return this._overlapTrigger;
  }
  set overlapTrigger(value: boolean) {
    this._overlapTrigger = coerceBooleanProperty(value);
  }
  private _overlapTrigger: boolean = this._defaultOptions.overlapTrigger;

  /** Whether the spotlight has a backdrop. */
  @Input()
  get hasBackdrop(): boolean | undefined {
    return this._hasBackdrop;
  }
  set hasBackdrop(value: boolean | undefined) {
    this._hasBackdrop = coerceBooleanProperty(value);
  }
  private _hasBackdrop: boolean | undefined = this._defaultOptions.hasBackdrop;

  /**
   * This method takes classes set on the host obd-spotlight element and applies them on the
   * spotlight template that displays in the overlay container.
   *
   * Otherwise, it's difficult to style the containing spotlight from outside the component.
   * @param classes list of class names
   */
  @Input('class')
  set panelClass(classes: string) {
    if (classes && classes.length) {
      this._classList = classes.split(' ').reduce((obj: any, className: string) => {
        obj[className] = true;
        return obj;
      }, {});

      this._elementRef.nativeElement.className = '';
    }
  }

  /**
   * This method takes classes set on the host mat-menu element and applies them on the
   * menu template that displays in the overlay container.  Otherwise, it's difficult
   * to style the containing menu from outside the component.
   * @deprecated Use `panelClass` instead.
   * @deletion-target 7.0.0
   */
  @Input()
  get classList(): string {
    return this.panelClass;
  }
  set classList(classes: string) {
    this.panelClass = classes;
  }

  /** Event emitted when the spotlight is closed. */
  @Output()
  readonly closed: EventEmitter<void | 'click' | 'keydown' | 'tab'> = new EventEmitter<
    void | 'click' | 'keydown' | 'tab'
  >();

  /**
   * Event emitted when the menu is closed.
   * @deprecated Switch to `closed` instead
   * @deletion-target 7.0.0
   */
  @Output() close = this.closed;

  constructor(
    private _elementRef: ElementRef,
    private _ngZone: NgZone,
    @Inject(SPOTLIGHT_DEFAULT_OPTIONS) private _defaultOptions: SpotlightDefaultOptions
  ) {}

  ngAfterContentInit() {
    // this._keyManager = new FocusKeyManager<MatMenuItem>(this._items).withWrap().withTypeAhead();
    this._tabSubscription = this._keyManager.tabOut.subscribe(() => this.close.emit('tab'));
  }

  ngOnDestroy() {
    this._tabSubscription.unsubscribe();
    this.closed.complete();
  }

  /**
   * Stream that emits whenever the hovered menu item changes.
   */
  _hovered() {}

  /**
   * Handle a keyboard event from the spotlight, delegating to the appropriate action.
   * */
  _handleKeydown(event: KeyboardEvent) {
    const keyCode = event.keyCode;

    switch (keyCode) {
      case ESCAPE:
        this.closed.emit('keydown');
        event.stopPropagation();
        break;
      case LEFT_ARROW:
        break;
      case RIGHT_ARROW:
        break;
      default:
        if (keyCode === UP_ARROW || keyCode === DOWN_ARROW) {
          this._keyManager.setFocusOrigin('keyboard');
        }

        this._keyManager.onKeydown(event);
    }
  }

  /**
   * Focus the first item in the menu.
   * @param origin Action from which the focus originated. Used to set the correct styling.
   */
  focusFirstItem(origin: FocusOrigin = 'program'): void {
    // When the content is rendered lazily, it takes a bit before the items are inside the DOM.
    if (this.lazyContent) {
      this._ngZone.onStable
        .asObservable()
        .pipe(take(1))
        .subscribe(() => this._keyManager.setFocusOrigin(origin).setFirstItemActive());
    } else {
      this._keyManager.setFocusOrigin(origin).setFirstItemActive();
    }
  }

  /**
   * Resets the active item in the menu. This is used when the menu is opened, allowing
   * the user to start from the first option when pressing the down arrow.
   */
  resetActiveItem() {
    this._keyManager.setActiveItem(-1);
  }

  /**
   * Sets the spotlight panel elevation.
   */
  setElevation(): void {
    // The elevation starts at the base and increases by one for each level.
    const newElevation = `mat-elevation-z${OBD_SPOTLIGHT_BASE_ELEVATION}`;
    const customElevation = Object.keys(this._classList).find(c => c.startsWith('mat-elevation-z'));

    if (!customElevation || customElevation === this._previousElevation) {
      if (this._previousElevation) {
        this._classList[this._previousElevation] = false;
      }

      this._classList[newElevation] = true;
      this._previousElevation = newElevation;
    }
  }

  /**
   * Starts the enter animation.
   */
  _startAnimation() {
    // @deletion-target 7.0.0 Combine with _resetAnimation.
    this._panelAnimationState = 'enter';
  }

  /**
   * Resets the panel animation to its initial state.
   */
  _resetAnimation() {
    // @deletion-target 7.0.0 Combine with _startAnimation.
    this._panelAnimationState = 'void';
  }

  /**
   * Callback that is invoked when the panel animation completes.
   */
  _onAnimationDone(event: AnimationEvent) {
    this._animationDone.next(event);
    this._isAnimating = false;
  }
}
