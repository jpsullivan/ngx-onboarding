import { EventEmitter, TemplateRef, InjectionToken } from '@angular/core';
import { MenuPositionX, MenuPositionY } from './spotlight-positions';
import { Direction } from '@angular/cdk/bidi';
import { FocusOrigin } from '@angular/cdk/a11y';
import { MatMenuContent } from '../directives/spotlight-content';

/**
 * Injection token used to provide the parent menu to spotlight-specific components.
 * @docs-private
 */
export const MAT_MENU_PANEL = new InjectionToken<MatMenuPanel>('MAT_MENU_PANEL');

/**
 * Interface for a custom spotlight panel that can be used with `obdSpotlightTargetFor`.
 * @docs-private
 */
export interface MatMenuPanel<T = any> {
  xPosition: MenuPositionX;
  yPosition: MenuPositionY;
  overlapTrigger: boolean;
  templateRef: TemplateRef<any>;
  close: EventEmitter<void | 'click' | 'keydown' | 'tab'>;
  parentMenu?: MatMenuPanel | undefined;
  direction?: Direction;
  focusFirstItem: (origin?: FocusOrigin) => void;
  resetActiveItem: () => void;
  setPositionClasses?: (x: MenuPositionX, y: MenuPositionY) => void;
  setElevation?(depth: number): void;
  lazyContent?: MatMenuContent;
  backdropClass?: string;
  hasBackdrop?: boolean;
  addItem?: (item: T) => void;
  removeItem?: (item: T) => void;
}
