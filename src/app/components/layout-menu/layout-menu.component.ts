/*
 * Copyright 2025 ByOmakase, LLC (https://byomakase.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Component, inject, signal} from '@angular/core';
import {IconDirective} from '../../common/icon/icon.directive';
import {NgbDropdownModule} from '@ng-bootstrap/ng-bootstrap';
import {LayoutService} from './layout.service';
import {SessionService} from '../../common/session/session.service';
import {Layout} from '../../model/session.model';
@Component({
  selector: 'app-layout-menu',
  imports: [IconDirective, NgbDropdownModule],
  template: `
    <div ngbDropdown class="layout-menu-wrapper">
      <div class="dropdown-toggle" ngbDropdownToggle>
        <i appIcon="menu"> </i>
      </div>
      <div class="layout-menu" ngbDropdownMenu>
        @for(layout of layouts(); track layout) {
        <button ngbDropdownItem (click)="sessionService.changeLayoutAndReloadMedia(layout)">{{ layoutLabels[layout] }}</button>
        }
      </div>
    </div>
  `,
})
export class LayoutMenu {
  public layoutService = inject(LayoutService);
  public sessionService = inject(SessionService);
  public layouts = signal<Layout[]>([]);
  public layoutLabels: Record<Layout, string> = {
    'simple': 'Simple Layout',
    'audio': 'Audio Layout',
    'marker': 'Marker Layout',
    'timeline': 'Timeline Layout',
    'stamp': 'Stamp Layout',
    'chromeless': 'Chromeless Layout',
    'editorial': 'Editorial Layout',
  };

  constructor() {
    this.layoutService.onLayoutChange$.subscribe((layout) => {
      this.layouts.set(this.layoutService.layouts.filter((l) => l !== layout));
    });
  }
}
