import { Component, OnInit, Input } from '@angular/core';
import { Select, Store } from '@ngxs/store';

@Component({
  selector: 'obd-manager',
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.css']
})
export class ManagerComponent implements OnInit {
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

  constructor(private store: Store) {}

  ngOnInit() {}
}
