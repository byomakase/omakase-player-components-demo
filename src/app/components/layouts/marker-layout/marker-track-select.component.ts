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

import {AfterViewInit, Component, effect, inject, OnDestroy} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Subject} from 'rxjs';
import {MarkerTrack, MarkerTrackService} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {StringUtil} from '../../../common/util/string-util';

@Component({
  selector: 'app-marker-track-select',
  imports: [ReactiveFormsModule],
  template: `
    <select [formControl]="selectControl">
      @for(track of markerTrackService.markerTracks(); track track) {
      <option [value]="$index">{{ resolveTrackDisplayName(track) }}</option>
      }
    </select>
  `,
})
export class MarkerTrackSelectComponent implements AfterViewInit, OnDestroy {
  selectControl = new FormControl();
  isVideoLoaded = false;
  private destroyed$ = new Subject<void>();

  public markerTrackService = inject(MarkerTrackService);

  constructor() {
    effect(() => {
      const tracks = this.markerTrackService.markerTracks();
      const active = this.markerTrackService.activeMarkerTrack();
      if (tracks.length === 0 || !active) return;
      const index = tracks.findIndex((t) => t === active);
      if (index !== -1 && index !== this.selectControl.value) {
        this.selectControl.setValue(index, {emitEvent: false});
      }
    });
  }

  ngAfterViewInit(): void {
    this.selectControl.valueChanges.subscribe((trackIndex) => {
      this.markerTrackService.activeMarkerTrack.set(this.markerTrackService.markerTracks().at(trackIndex));
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  resolveTrackDisplayName(track: MarkerTrack) {
    if (!track.label || track.label === '') {
      return StringUtil.leafUrlToken(track.src);
    }

    return track.label;
  }
}
