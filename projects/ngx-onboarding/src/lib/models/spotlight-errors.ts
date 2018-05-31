/**
 * Throws an exception for the case when spotlight trigger doesn't
 * have a valid `obd-spotlight` instance
 * @docs-private
 */
export function throwSpotlightMissingError() {
  throw Error(`mat-menu-trigger: must pass in an mat-menu instance.
    Example:
      <mat-menu #menu="matMenu"></mat-menu>
      <button [matMenuTriggerFor]="menu"></button>`);
}

/**
 * Throws an exception for the case when menu's x-position value isn't valid.
 * In other words, it doesn't match 'before' or 'after'.
 * @docs-private
 */
export function throwSpotlightInvalidPositionX() {
  throw Error(`x-position value must be either 'before' or after'.
      Example: <mat-menu x-position="before" #menu="matMenu"></mat-menu>`);
}

/**
 * Throws an exception for the case when menu's y-position value isn't valid.
 * In other words, it doesn't match 'above' or 'below'.
 * @docs-private
 */
export function throwSpotlightInvalidPositionY() {
  throw Error(`y-position value must be either 'above' or below'.
      Example: <mat-menu y-position="above" #menu="matMenu"></mat-menu>`);
}
