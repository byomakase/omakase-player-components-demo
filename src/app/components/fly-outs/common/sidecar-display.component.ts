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

import {Component, input, output} from '@angular/core';
import {IconDirective} from '../../../common/icon/icon.directive';
import {StringUtil} from '../../../common/util/string-util';

@Component({
  selector: 'app-sidecar-display',
  template: `
    <div class="container">
      <div class="text-container">
        <div class="label">{{ label() }}</div>
        <div class="url">{{ url() }}</div>
      </div>
      @if (isDeletable()) {
      <i appIcon="delete" (click)="deleted.emit()"></i>
      } @if (isLoading()) {
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden"></span>
      </div>
      }
    </div>
  `,
  imports: [IconDirective],
  host: {
    'class': 'sidecar-display',
  },
})
export class SidecarDisplay {
  label = input<string | undefined>('');
  url = input('', {transform: StringUtil.leafUrlToken});
  isDeletable = input(true);
  isLoading = input(false);
  deleted = output<void>();
}
