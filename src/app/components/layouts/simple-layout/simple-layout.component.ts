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
import {PlayerComponent} from '../../player/player.component';
import {toObservable} from '@angular/core/rxjs-interop';
import {MarkerTrackApi, MomentMarker, PeriodMarker} from '@byomakase/omakase-player';
import {Subject, filter, take, takeUntil, skip} from 'rxjs';
import {MarkerTrackService, MarkerTrack} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {PlayerService} from '../../player/player.service';
import {MarkerTrackSelectComponent} from '../marker-layout/marker-track-select.component';
import {ColorService} from '../../../common/services/color.service';

@Component({
  selector: 'app-simple-layout',
  imports: [PlayerComponent, MarkerTrackSelectComponent],
  host: {'class': 'simple-layout'},
  template: `
    <div class="player-wrapper">
      <app-player></app-player>
      @if (markerTrackService.markerTracks().length > 1) {
      <div class="track-select-container">
        <app-marker-track-select> </app-marker-track-select>
      </div>
      }
    </div>
  `,
})
export class SimpleLayoutComponent {
  public markerTrackService = inject(MarkerTrackService);
  private destroyed$ = new Subject<void>();
  private colorService = inject(ColorService);

  // replay subject with replay value of 1, first value should be skipped
  // inspected in angular source code, possibly subjected to change
  private markerTrack$ = toObservable<MarkerTrack | undefined>(this.markerTrackService.activeMarkerTrack);

  private playerService = inject(PlayerService);

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  constructor() {
    this.markerTrack$.subscribe((markerTrack) => {
      if (!markerTrack) {
        this.playerService.omakasePlayer?.progressMarkerTrack?.removeAllMarkers();
        return;
      }

      this.playerService.onCreated$
        .pipe(
          filter((p) => !!p),
          take(1),
          takeUntil(this.destroyed$),
          takeUntil(this.markerTrack$.pipe(skip(1)))
        )
        .subscribe((player) => {
          player.video.onVideoLoaded$
            .pipe(
              filter((p) => !!p),
              takeUntil(this.destroyed$),
              takeUntil(this.markerTrack$.pipe(skip(1)))
            )
            .subscribe(() => {
              this.createMarkerTrack();
            });
        });
    });
  }

  private createMarkerTrack() {
    const player = this.playerService.omakasePlayer;
    const markerTrack = this.markerTrackService.activeMarkerTrack();
    if (!player) {
      console.warn("player is undefined, can't create marker list");
      return;
    }

    player.progressMarkerTrack?.removeAllMarkers();
    if (!markerTrack) {
      return;
    }

    const colorResolver = this.colorService.createColorResolver(crypto.randomUUID(), this.markerTrackService.HEX_COLORS);

    player.progressMarkerTrack?.loadVtt(markerTrack.src, {
      vttMarkerCreateFn(cue, index) {
        const name = '';

        const color = markerTrack.color !== 'multicolor' ? markerTrack.color : colorResolver.getColor(true);
        if (cue.endTime - cue.startTime < 1) {
          return new MomentMarker({
            timeObservation: {
              time: cue.startTime,
            },
            style: {
              color: color,
            },
            editable: !markerTrack.readOnly,
            text: name === '' ? `Marker ${index + 1}` : name,
          });
        } else {
          return new PeriodMarker({
            timeObservation: {
              start: cue.startTime,
              end: cue.endTime,
            },
            style: {
              color: color,
            },
            editable: !markerTrack.readOnly,
            text: name === '' ? `Marker ${index + 1}` : name,
          });
        }
      },
    });
  }
}
