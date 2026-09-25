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

import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {LayoutService} from '../../layout-menu/layout.service';

/**
 * Masks the application while a layout switch is in flight, i.e. from the moment a switch is
 * requested until the newly created player starts loading main media. Rendered once in the
 * application root and driven entirely by {@link LayoutService.layoutSwitch}.
 */
@Component({
  selector: 'app-layout-switch-overlay',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (layoutService.layoutSwitch(); as layoutSwitch) {
      <div class="layout-switch-overlay">
        <div class="layout-switch-spinner"></div>
        <div class="layout-switch-message">
          {{ layoutSwitch.isUpdate ? 'Updating' : 'Switching to' }} {{ layoutService.layoutLabels[layoutSwitch.layout] }}
        </div>
      </div>
    }
  `,
})
export class LayoutSwitchOverlay {
  public layoutService = inject(LayoutService);
}
