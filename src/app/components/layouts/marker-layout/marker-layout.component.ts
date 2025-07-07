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

import {Component, CUSTOM_ELEMENTS_SCHEMA, inject} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {MarkerTrackService} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {MarkerListComponent} from './marker-list.component';
import {MarkerTrackSelectComponent} from './marker-track-select.component';
import {IconDirective} from '../../../common/icon/icon.directive';

@Component({
  selector: 'app-marker-layout',
  imports: [PlayerComponent, MarkerListComponent, MarkerTrackSelectComponent, IconDirective],
  host: {'class': 'marker-layout'},
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="left-side">
      <div class="player-wrapper">
        <app-player></app-player>
        <template id="omakase-media-chrome">
          <media-control-bar>
            <omakase-marker-bar></omakase-marker-bar>
            <omakase-time-range></omakase-time-range>
          </media-control-bar>
        </template>
      </div>
      @if(markerTrackService.markerTracks().length > 1) {
      <app-marker-track-select />
      }
    </div>
    <div class="right-side">
      @if (markerTrackService.activeMarkerTrack()) {
      <app-marker-list [markerTrack]="markerTrackService.activeMarkerTrack()" />

      } @else {
      <div class="info-message">No marker tracks have been loaded. Click <i appIcon="pin"> </i>to load a marker track.</div>

      }
    </div>
  `,
})
export class MarkerLayoutComponent {
  public markerTrackService = inject(MarkerTrackService);

  constructor() {}
}
