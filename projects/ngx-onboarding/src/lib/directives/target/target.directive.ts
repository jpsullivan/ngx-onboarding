import { FocusMonitor, FocusOrigin, isFakeMousedownFromScreenReader } from '@angular/cdk/a11y';
import { Direction, Directionality } from '@angular/cdk/bidi';
import { LEFT_ARROW, RIGHT_ARROW } from '@angular/cdk/keycodes';
import {
  FlexibleConnectedPositionStrategy,
  HorizontalConnectionPos,
  Overlay,
  OverlayConfig,
  OverlayRef,
  ScrollStrategy,
  VerticalConnectionPos
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  AfterContentInit,
  Directive,
  ElementRef,
  EventEmitter,
  Inject,
  InjectionToken,
  Input,
  OnDestroy,
  Optional,
  Output,
  Self,
  ViewContainerRef
} from '@angular/core';
import { asapScheduler, merge, of as observableOf, Subscription } from 'rxjs';
import { delay, filter, take, takeUntil } from 'rxjs/operators';
import { Spotlight } from '../../components/spotlight/spotlight.component';
import { throwSpotlightMissingError } from '../../models/spotlight-errors';
import { SpotlightPanel } from '../../models/spotlight-panel';
import { SpotlightPositionX, SpotlightPositionY } from '../../models/spotlight-positions';

/**
 * Injection token that determines the scroll handling while the spotlight is open.
 */
export const OBD_SPOTLIGHT_SCROLL_STRATEGY = new InjectionToken<() => ScrollStrategy>(
  'obd-spotlight-scroll-strategy'
);

/** @docs-private */
export function OBD_SPOTLIGHT_SCROLL_STRATEGY_FACTORY(overlay: Overlay): () => ScrollStrategy {
  return () => overlay.scrollStrategies.reposition();
}

/** @docs-private */
export const OBD_SPOTLIGHT_SCROLL_STRATEGY_FACTORY_PROVIDER = {
  provide: OBD_SPOTLIGHT_SCROLL_STRATEGY,
  deps: [Overlay],
  useFactory: OBD_SPOTLIGHT_SCROLL_STRATEGY_FACTORY
};

/**
 * Default top padding of the spotlight panel
 */
export const SPOTLIGHT_PANEL_TOP_PADDING = 8;

/**
 * This directive is intended to be used in conjunction with an obd-spotlight tag.  It is
 * responsible for toggling the display of the provided spotlight instance.
 */
@Directive({
  selector: `[obdSpotlightTargetFor]`,
  host: {
    'aria-haspopup': 'true',
    '(mousedown)': '_handleMousedown($event)',
    '(keydown)': '_handleKeydown($event)',
    '(click)': '_handleClick($event)'
  },
  exportAs: 'obdSpotlightTarget'
})
export class SpotlightTargetDirective implements AfterContentInit, OnDestroy {
  private _portal: TemplatePortal;
  private _overlayRef: OverlayRef | null = null;
  private _spotlightOpen: boolean = false;
  private _closeSubscription = Subscription.EMPTY;
  private _hoverSubscription = Subscription.EMPTY;

  // Tracking input type is necessary so it's possible to only auto-focus
  // the first item of the list when the spotlight is opened via the keyboard
  private _openedByMouse: boolean = false;

  /**
   * References the spotlight instance that the target is associated with.
   */
  @Input('obdSpotlightTargetFor') spotlight: SpotlightPanel;

  /**
   * Data to be passed along to any lazily-rendered content.
   */
  @Input('obdSpotlightTriggerData') spotlightData: any;

  /**
   * Event emitted when the associated spotlight is opened.
   */
  @Output() readonly spotlightOpened: EventEmitter<void> = new EventEmitter<void>();

  /**
   * Event emitted when the associated spotlight is closed.
   */
  @Output() readonly spotlightClosed: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private _overlay: Overlay,
    private _element: ElementRef,
    private _viewContainerRef: ViewContainerRef,
    @Inject(OBD_SPOTLIGHT_SCROLL_STRATEGY) private _scrollStrategy,
    @Optional() private _dir: Directionality,
    // TODO(crisbeto): make the _focusMonitor required when doing breaking changes.
    // @deletion-target 7.0.0
    private _focusMonitor?: FocusMonitor
  ) {}

  ngAfterContentInit() {
    this._checkSpotlight();

    this.spotlight.close.subscribe(reason => {
      this._destroySpotlight();
    });

    this._handleHover();
  }

  ngOnDestroy() {
    if (this._overlayRef) {
      this._overlayRef.dispose();
      this._overlayRef = null;
    }

    this._cleanUpSubscriptions();
  }

  /**
   * Whether the spotlight is open.
   * @readonly
   * @type {boolean}
   */
  get spotlightOpen(): boolean {
    return this._spotlightOpen;
  }

  /**
   * The text direction of the containing app.
   * @readonly
   * @type {Direction}
   */
  get dir(): Direction {
    return this._dir && this._dir.value === 'rtl' ? 'rtl' : 'ltr';
  }

  /**
   * Toggles the spotlight between the open and closed states.
   * @returns {void}
   */
  toggleSpotlight(): void {
    return this._spotlightOpen ? this.closeSpotlight() : this.openSpotlight();
  }

  /**
   * Opens the spotlight.
   * @returns {void}
   */
  openSpotlight(): void {
    if (this._spotlightOpen) {
      return;
    }

    const overlayRef = this._createOverlay();
    overlayRef.attach(this._portal);

    if (this.spotlight.lazyContent) {
      this.spotlight.lazyContent.attach(this.spotlightData);
    }

    this._closeSubscription = this._spotlightClosingActions().subscribe(() =>
      this.closeSpotlight()
    );
    this._initSpotlight();

    if (this.spotlight instanceof Spotlight) {
      this.spotlight._startAnimation();
    }
  }

  /**
   * Closes the spotlight.
   */
  closeSpotlight(): void {
    this.spotlight.close.emit();
  }

  /**
   * Focuses the spotlight target.
   * @param origin Source of the spotlight target's focus.
   */
  focus(origin: FocusOrigin = 'program') {
    if (this._focusMonitor) {
      this._focusMonitor.focusVia(this._element.nativeElement, origin);
    } else {
      this._element.nativeElement.focus();
    }
  }

  /**
   * Closes the spotlight and does the necessary cleanup.
   * @private
   * @returns
   */
  private _destroySpotlight() {
    if (!this._overlayRef || !this.spotlightOpen) {
      return;
    }

    const spotlight = this.spotlight;

    this._closeSubscription.unsubscribe();
    this._overlayRef.detach();

    if (spotlight instanceof Spotlight) {
      spotlight._resetAnimation();

      if (spotlight.lazyContent) {
        // Wait for the exit animation to finish before detaching the content.
        spotlight._animationDone
          .pipe(filter(event => event.toState === 'void'), take(1))
          .subscribe(() => {
            spotlight.lazyContent!.detach();
            this._resetSpotlight();
          });
      } else {
        this._resetSpotlight();
      }
    } else {
      this._resetSpotlight();

      if (spotlight.lazyContent) {
        spotlight.lazyContent.detach();
      }
    }
  }

  /**
   * This method sets the spotlight state to open and focuses the first item if
   * the spotlight was opened via the keyboard.
   */
  private _initSpotlight(): void {
    this.spotlight.direction = this.dir;
    this._setSpotlightElevation();
    this._setIsSpotlightOpen(true);
    this.spotlight.focusFirstItem(this._openedByMouse ? 'mouse' : 'program');
  }

  /**
   * Updates the spotlight elevation.
   * @private
   */
  private _setSpotlightElevation(): void {
    if (this.spotlight.setElevation) {
      let depth = 0;
      this.spotlight.setElevation(depth);
    }
  }

  /**
   * This method resets the spotlight when it's closed, most importantly restoring
   * focus to the spotlight target if the spotlight was opened via the keyboard.
   */
  private _resetSpotlight(): void {
    this._setIsSpotlightOpen(false);

    // We should reset focus if the user is navigating using a keyboard or
    // if we have a top-level trigger which might cause focus to be lost
    // when clicking on the backdrop.
    if (!this._openedByMouse) {
      // Note that the focus style will show up both for `program` and
      // `keyboard` so we don't have to specify which one it is.
      this.focus();
    }

    this._openedByMouse = false;
  }

  /**
   * Set state rather than toggle to support targets sharing a spotlight
   * @param isOpen
   */
  private _setIsSpotlightOpen(isOpen: boolean): void {
    this._spotlightOpen = isOpen;
    this._spotlightOpen ? this.spotlightOpened.emit() : this.spotlightClosed.emit();
  }

  /**
   * This method checks that a valid instance of Spotlight has been passed into
   * obdSpotlightTargetFor. If not, an exception is thrown.
   */
  private _checkSpotlight() {
    if (!this.spotlight) {
      throwSpotlightMissingError();
    }
  }

  /**
   * This method creates the overlay from the provided spotlight's template and saves its
   * OverlayRef so that it can be attached to the DOM when openSpotlight is called.
   */
  private _createOverlay(): OverlayRef {
    if (!this._overlayRef) {
      this._portal = new TemplatePortal(this.spotlight.templateRef, this._viewContainerRef);
      const config = this._getOverlayConfig();
      this._subscribeToPositions(config.positionStrategy as FlexibleConnectedPositionStrategy);
      this._overlayRef = this._overlay.create(config);
    }

    return this._overlayRef;
  }

  /**
   * This method builds the configuration object needed to create the overlay, the OverlayState.
   * @returns OverlayConfig
   */
  private _getOverlayConfig(): OverlayConfig {
    return new OverlayConfig({
      positionStrategy: this._getPosition(),
      hasBackdrop: this.spotlight.hasBackdrop,
      backdropClass: this.spotlight.backdropClass || 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this._scrollStrategy(),
      direction: this._dir
    });
  }

  /**
   * Listens to changes in the position of the overlay and sets the correct classes
   * on the spotlight based on the new position. This ensures the animation origin is always
   * correct, even if a fallback position is used for the overlay.
   */
  private _subscribeToPositions(position: FlexibleConnectedPositionStrategy): void {
    if (this.spotlight.setPositionClasses) {
      position.positionChanges.subscribe(change => {
        const posX: SpotlightPositionX =
          change.connectionPair.overlayX === 'start' ? 'after' : 'before';
        const posY: SpotlightPositionY =
          change.connectionPair.overlayY === 'top' ? 'below' : 'above';

        this.spotlight.setPositionClasses!(posX, posY);
      });
    }
  }

  /**
   * This method builds the position strategy for the overlay, so
   * the spotlight is properly connected to the trigger.
   * @returns {ConnectedPositionStrategy}
   */
  private _getPosition(): FlexibleConnectedPositionStrategy {
    let [originX, originFallbackX]: HorizontalConnectionPos[] =
      this.spotlight.xPosition === 'before' ? ['end', 'start'] : ['start', 'end'];

    let [overlayY, overlayFallbackY]: VerticalConnectionPos[] =
      this.spotlight.yPosition === 'above' ? ['bottom', 'top'] : ['top', 'bottom'];

    let [originY, originFallbackY] = [overlayY, overlayFallbackY];
    let [overlayX, overlayFallbackX] = [originX, originFallbackX];
    let offsetY = 0;

    if (!this.spotlight.overlapTrigger) {
      originY = overlayY === 'top' ? 'bottom' : 'top';
      originFallbackY = overlayFallbackY === 'top' ? 'bottom' : 'top';
    }

    return this._overlay
      .position()
      .flexibleConnectedTo(this._element)
      .withTransformOriginOn('.mat-menu-panel')
      .withPositions([
        { originX, originY, overlayX, overlayY, offsetY },
        { originX: originFallbackX, originY, overlayX: overlayFallbackX, overlayY, offsetY },
        {
          originX,
          originY: originFallbackY,
          overlayX,
          overlayY: overlayFallbackY,
          offsetY: -offsetY
        },
        {
          originX: originFallbackX,
          originY: originFallbackY,
          overlayX: overlayFallbackX,
          overlayY: overlayFallbackY,
          offsetY: -offsetY
        }
      ]);
  }

  /**
   * Cleans up the active subscriptions.
   */
  private _cleanUpSubscriptions(): void {
    this._closeSubscription.unsubscribe();
    this._hoverSubscription.unsubscribe();
  }

  /**
   * Returns a stream that emits whenever an action that should close the spotlight occurs.
   */
  private _spotlightClosingActions() {
    const backdrop = this._overlayRef!.backdropClick();
    const detachments = this._overlayRef!.detachments();
    const hover = observableOf();

    return merge(backdrop, hover, detachments);
  }

  /**
   * Handles mouse presses on the target.
   */
  _handleMousedown(event: MouseEvent): void {
    if (!isFakeMousedownFromScreenReader(event)) {
      this._openedByMouse = true;
    }
  }

  /**
   * Handles key presses on the target.
   */
  _handleKeydown(event: KeyboardEvent): void {
    const keyCode = event.keyCode;
  }

  /**
   * Handles click events on the trigger.
   */
  _handleClick(event: MouseEvent): void {
    this.toggleSpotlight();
  }

  /**
   * Handles the cases where the user hovers over the trigger.
   */
  private _handleHover() {}
}
