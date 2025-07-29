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

import {Component, CUSTOM_ELEMENTS_SCHEMA, HostListener, inject, OnDestroy, signal} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {MarkerTrack, MarkerTrackService} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {MarkerTrackSelectComponent} from './marker-track-select.component';
import {IconDirective} from '../../../common/icon/icon.directive';
import {MarkerApi, MarkerTrackApi, MomentMarker, MomentObservation, PeriodMarker, PeriodObservation} from '@byomakase/omakase-player';
import {PlayerService} from '../../player/player.service';
import {filter, skip, Subject, take, takeUntil} from 'rxjs';
import {CueUtil} from '../../../common/util/cue-util';
import {MarkerListComponent} from '../../../common/marker-list/marker-list.component';
import {toObservable} from '@angular/core/rxjs-interop';
import {ColorService} from '../../../common/services/color.service';
import {MarkerShortcutUtil} from '../../../common/util/marker-shortcut-util';

@Component({
  selector: 'app-marker-layout',
  imports: [PlayerComponent, MarkerTrackSelectComponent, IconDirective, MarkerListComponent],
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
      @if (renderedMarkerTrack()) {
      <app-marker-list [source]="renderedMarkerTrack()" [readOnly]="markerTrackService.activeMarkerTrack()?.readOnly ?? true" />

      } @else {
      <div class="info-message">No marker tracks have been loaded. Click <i appIcon="pin"> </i>to load a marker track.</div>

      }
    </div>
  `,
})
export class MarkerLayoutComponent implements OnDestroy {
  public markerTrackService = inject(MarkerTrackService);
  public renderedMarkerTrack = signal<MarkerTrackApi | undefined>(undefined);
  private destroyed$ = new Subject<void>();

  // replay subject with replay value of 1, first value should be skipped
  // inspected in angular source code, possibly subjected to change
  private markerTrack$ = toObservable<MarkerTrack | undefined>(this.markerTrackService.activeMarkerTrack);

  private playerService = inject(PlayerService);
  private colorService = inject(ColorService);

  private appendedHelpMenuGroup = false;

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  constructor() {
    this.markerTrack$.subscribe((markerTrack) => {
      if (!markerTrack) {
        this.renderedMarkerTrack()?.destroy();
        this.renderedMarkerTrack.set(undefined);
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
              if (!this.appendedHelpMenuGroup) {
                player.video.appendHelpMenuGroup(MarkerShortcutUtil.getKeyboardShortcutsHelpMenuGroup('unknown'));
                this.appendedHelpMenuGroup = true;
              }
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

    if (!markerTrack) {
      return;
    }

    this.renderedMarkerTrack()?.destroy();

    const colorResolver = this.colorService.createColorResolver(crypto.randomUUID(), this.markerTrackService.HEX_COLORS);

    player
      .createMarkerTrack({
        vttUrl: markerTrack.src,
        vttMarkerCreateFn: (cue, index) => {
          const name = CueUtil.extractName(cue.text);
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
      })
      .subscribe((markerTrack) => {
        this.renderedMarkerTrack.set(markerTrack);

        markerTrack.onMarkerSelected$.subscribe((markerSelectedEvent) => {
          if (markerSelectedEvent.marker) {
            this.seekToMarker(markerSelectedEvent.marker);
          }
        });
      });
  }

  seekToMarker(marker: MarkerApi) {
    const timeObservation = marker.timeObservation;
    let start;

    if ('start' in timeObservation) {
      start = (timeObservation as PeriodObservation).start!;
    } else {
      start = (timeObservation as MomentObservation).time;
    }

    return this.playerService.omakasePlayer!.video.pause().subscribe(() => this.playerService.omakasePlayer!.video.seekToTime(start));
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    if (this.playerService.omakasePlayer) {
      const isHandled = MarkerShortcutUtil.handleKeyboardEvent(event, this.playerService.omakasePlayer, this.renderedMarkerTrack());
      if (isHandled) {
        event.preventDefault();
      }
    }
  }
}
