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
import {Component, computed, input, output} from '@angular/core';
import {ColorUtil} from '../../util/color-util';
import {IconDirective} from '../../icon/icon.directive';

/**
 * Component used to visualize multicolor coloring scheme that allows specification of 4 colors
 * that will be present in the scheme
 */
@Component({
  selector: 'app-multicolor-square',
  imports: [IconDirective],
  template: `
    <div class="square">
      @for(color of colors(); track color) {
      <div class="subsquare" [style.backgroundColor]="color"></div>
      }
    </div>
    @if (active()) {
    <i appIcon="checkbox-checked" [style]="{color: checkboxColor()}"></i>
    }
  `,
})
export class ColorSquareComponent {
  colors = input.required<string[]>();
  active = input<boolean>(false);
  click = output<void>();

  checkboxColor = computed(() => {
    const contrastingColors = this.colors().map((color) => ColorUtil.getContrastingTextColor(color));
    const whiteContrastingColorNumber = contrastingColors.filter((color) => color === '#ffffff').length;

    return whiteContrastingColorNumber > 2 ? '#ffffff' : '#000000';
  });
}
