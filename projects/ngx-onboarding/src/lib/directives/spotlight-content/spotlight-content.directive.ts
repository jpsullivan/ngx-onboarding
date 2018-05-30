import {
  Directive,
  TemplateRef,
  ComponentFactoryResolver,
  ApplicationRef,
  Injector,
  ViewContainerRef,
  Inject,
  OnDestroy
} from '@angular/core';
import { TemplatePortal, DomPortalOutlet } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';

/**
 * Content that will be rendered lazily once the spotlight is opened.
 */
@Directive({
  selector: 'ng-template[obdSpotlightContent]'
})
export class MatMenuContent implements OnDestroy {
  private _portal: TemplatePortal<any>;
  private _outlet: DomPortalOutlet;

  constructor(
    private _template: TemplateRef<any>,
    private _componentFactoryResolver: ComponentFactoryResolver,
    private _appRef: ApplicationRef,
    private _injector: Injector,
    private _viewContainerRef: ViewContainerRef,
    @Inject(DOCUMENT) private _document: any
  ) {}

  /**
   * Attaches the content with a particular context.
   * @docs-private
   */
  attach(context: any = {}) {
    if (!this._portal) {
      this._portal = new TemplatePortal(this._template, this._viewContainerRef);
    }

    this.detach();

    if (!this._outlet) {
      this._outlet = new DomPortalOutlet(
        this._document.createElement('div'),
        this._componentFactoryResolver,
        this._appRef,
        this._injector
      );
    }

    const element: HTMLElement = this._template.elementRef.nativeElement;

    // Because we support opening the same spotlight from different triggers (which in turn have their
    // own `OverlayRef` panel), we have to re-insert the host element every time, otherwise we
    // risk it staying attached to a pane that's no longer in the DOM.
    element.parentNode!.insertBefore(this._outlet.outletElement, element);
    this._portal.attach(this._outlet, context);
  }

  /**
   * Detaches the content.
   * @docs-private
   */
  detach() {
    if (this._portal.isAttached) {
      this._portal.detach();
    }
  }

  ngOnDestroy() {
    if (this._outlet) {
      this._outlet.dispose();
    }
  }
}
