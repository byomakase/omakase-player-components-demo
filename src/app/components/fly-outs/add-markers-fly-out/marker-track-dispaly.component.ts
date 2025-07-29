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

import {Component, computed, inject, input, output} from '@angular/core';
import {IconDirective} from '../../../common/icon/icon.directive';
import {StringUtil} from '../../../common/util/string-util';
import {MarkerTrack, MarkerTrackService} from './marker-track.service';
import {ColorSquareComponent} from '../../../common/controls/color-picker/multicolor-square.component';

@Component({
  selector: 'app-marker-track-display',
  template: `
    <div class="container">
      <div class="text-container">
        <div class="label">{{ markerTrack().label }}</div>
        <div class="lower-container">
          @if(markerTrack().color !== 'multicolor') {
          <div class="color-display" [style]="{'background-color': markerTrack().color}"></div>
          } @else {
          <app-multicolor-square [colors]="markerTrackService.MULTICOLOR_COLORS"> </app-multicolor-square>

          }
          <div class="url">{{ filename() }}</div>
        </div>
      </div>

      <i appIcon="delete" (click)="deleted.emit()"></i>
    </div>
  `,
  imports: [IconDirective, ColorSquareComponent],
  host: {
    'class': 'marker-track-display',
  },
})
export class MarkerTrackDisplay {
  markerTrack = input.required<MarkerTrack>();
  markerTrackService = inject(MarkerTrackService);
  filename = computed(() => StringUtil.leafUrlToken(this.markerTrack().src));
  deleted = output<void>();
}
