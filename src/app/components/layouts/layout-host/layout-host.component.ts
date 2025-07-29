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

import {Component, Type, inject, AfterViewChecked, input} from '@angular/core';
import {NgComponentOutlet} from '@angular/common';
import {LayoutService} from '../../layout-menu/layout.service';

/**
 * Component used to render currently active layout. It notifies the layout service
 * when the layout has been rendered fully for the first time.
 */
@Component({
  selector: 'app-layout-host',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `<ng-container *ngComponentOutlet="layout()" />`,
})
export class LayoutHost implements AfterViewChecked {
  layout = input.required<Type<any>>();

  private layoutService = inject(LayoutService);
  private shouldNotify = false;

  constructor() {
    this.layoutService.onLayoutChange$.subscribe(() => {
      this.shouldNotify = true;
    });
  }

  ngAfterViewChecked() {
    if (this.shouldNotify) {
      this.shouldNotify = false;
      this.layoutService.onLayoutInitialized$.next(true);
    }
  }
}
