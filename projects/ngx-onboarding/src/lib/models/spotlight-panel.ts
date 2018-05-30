import { EventEmitter, TemplateRef, InjectionToken } from '@angular/core';
import { SpotlightPositionX, SpotlightPositionY } from './spotlight-positions';
import { Direction } from '@angular/cdk/bidi';
import { FocusOrigin } from '@angular/cdk/a11y';
import { SpotlightContent } from '../directives/spotlight-content';

/**
 * Injection token used to provide the parent menu to spotlight-specific components.
 * @docs-private
 */
export const OBD_SPOTLIGHT_PANEL = new InjectionToken<SpotlightPanel>('MAT_MENU_PANEL');

/**
 * Interface for a custom spotlight panel that can be used with `obdSpotlightTargetFor`.
 * @docs-private
 */
export interface SpotlightPanel<T = any> {
  xPosition: SpotlightPositionX;
  yPosition: SpotlightPositionY;
  overlapTrigger: boolean;
  templateRef: TemplateRef<any>;
  close: EventEmitter<void | 'click' | 'keydown' | 'tab'>;
  parentMenu?: SpotlightPanel | undefined;
  direction?: Direction;
  focusFirstItem: (origin?: FocusOrigin) => void;
  resetActiveItem: () => void;
  setPositionClasses?: (x: SpotlightPositionX, y: SpotlightPositionY) => void;
  setElevation?(depth: number): void;
  lazyContent?: SpotlightContent;
  backdropClass?: string;
  hasBackdrop?: boolean;
  addItem?: (item: T) => void;
  removeItem?: (item: T) => void;
}
