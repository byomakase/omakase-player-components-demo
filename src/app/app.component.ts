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
import {IconModule} from './common/icon/icon.module';
import {FlyOutMenu} from './components/fly-out-menu/fly-out-menu.component';
import {ToastService} from './common/toast/toast.service';
import {ToastComponent} from './common/toast/toast.component';
import {LayoutMenu} from './components/layout-menu/layout-menu.component';
import {SimpleLayoutComponent} from './components/layouts/simple-layout/simple-layout.component';
import {AudioLayoutComponent} from './components/layouts/audio-layout/audio-layout.component';
import {Type} from '@angular/core';
import {Layout, LayoutService} from './components/layout-menu/layout.service';
import {LayoutHost} from './components/layouts/layout-host/layout-host.component';
import {MarkerLayoutComponent} from './components/layouts/marker-layout/marker-layout.component';

const layouts: Record<Layout, Type<any>> = {
  'simple': SimpleLayoutComponent,
  'audio-mode': AudioLayoutComponent,
  'marker-mode': MarkerLayoutComponent,
};

@Component({
  selector: 'app-root',
  imports: [IconModule, FlyOutMenu, ToastComponent, LayoutMenu, LayoutHost],
  template: `
    <div class="header">
      <i appIcon="omakase-logo"> </i>
      <app-layout-menu />
    </div>
    <div class="content">
      <div fly-out-menu class="fly-out-menu"></div>
      <app-layout-host [layout]="layoutComponent()" />
    </div>
    <div class="toast-container">
      @for (toast of toastService.toasts; track toast) {
      <app-toast [toast]="toast"></app-toast>
      }
    </div>
  `,
})
export class AppComponent {
  title = 'omakase-player-components-demo';
  public toastService = inject(ToastService);
  public layoutService = inject(LayoutService);
  public layoutComponent = signal<Type<any>>(SimpleLayoutComponent);
  constructor() {
    this.layoutService.onLayoutChange$.subscribe((layout) => {
      return this.layoutComponent.set(layouts[layout]);
    });
  }
}
