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
import {IconDirective} from '../../icon/icon.directive';

/**
 * Reusable checkbox component, by using clicked output you can track clicks.
 * Checked state is stored in the parent component.
 */
@Component({
  selector: 'app-checkbox',
  template: `
    <span (click)="clicked.emit()">
      @if( checked()) {
      <i appIcon="checkbox-checked"> </i>
      } @else {
      <i appIcon="checkbox-unchecked"> </i>
      }
    </span>
  `,
  standalone: true,
  imports: [IconDirective],
})
export class CheckboxComponent {
  checked = input<boolean>();
  clicked = output<void>();
}
