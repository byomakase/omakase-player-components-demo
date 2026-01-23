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

import {Component, inject, OnDestroy, signal} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {toObservable} from '@angular/core/rxjs-interop';
import {MarkerTrackApi, MomentMarker, PeriodMarker} from '@byomakase/omakase-player';
import {Subject, filter, take, takeUntil, skip, BehaviorSubject, combineLatest} from 'rxjs';
import {MarkerTrackService, MarkerTrack} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {PlayerService} from '../../player/player.service';
import {ColorService} from '../../../common/services/color.service';
import {MarkerTrackSelectComponent} from '../../../common/controls/marker-track-select/marker-track-select.component';
import {SimpleLayoutConfigProviderService, SimpleLayoutTheme} from '../../layout-menu/config-providers/simple-layout-config-provider.service';
import {ThemeSelectComponent} from '../../../common/controls/theme-select/theme-select.component';
import {SessionService} from '../../../common/session/session.service';

@Component({
  selector: 'app-simple-layout',
  imports: [PlayerComponent, MarkerTrackSelectComponent, ThemeSelectComponent],
  host: {'class': 'simple-layout'},
  template: `
    <div class="player-wrapper">
      <app-player></app-player>
      <div class="selects-container">
        @if (isVideoLoaded()) {
        <app-theme-select [themes]="simpleLayoutConfigProviderService.themes" [initiallySelectedTheme]="simpleLayoutConfigProviderService.getTheme()" (themeSelect)="changeSelectedTheme($event)" />
        } @if (markerTrackService.markerTracks().length > 1) {
        <div class="track-select-container">
          <app-marker-track-select> </app-marker-track-select>
        </div>
        }
      </div>
    </div>
  `,
})
export class SimpleLayoutComponent implements OnDestroy {
  public markerTrackService = inject(MarkerTrackService);
  private destroyed$ = new Subject<void>();
  private colorService = inject(ColorService);
  public simpleLayoutConfigProviderService = inject(SimpleLayoutConfigProviderService);

  // replay subject with replay value of 1, first value should be skipped
  // inspected in angular source code, possibly subjected to change
  private markerTrack$ = toObservable<MarkerTrack | undefined>(this.markerTrackService.activeMarkerTrack);

  private playerService = inject(PlayerService);
  private sessionService = inject(SessionService);
  public isVideoLoaded = signal<boolean>(false);

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  constructor() {
    combineLatest([this.markerTrack$, this.playerService.onCreated$.pipe(filter((p) => !!p))])
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([markerTrack, player]) => {
        if (!markerTrack) {
          this.playerService.omakasePlayer?.chroming.progressMarkerTrack?.removeAllMarkers();
          return;
        }

        // this.playerService.onCreated$
        //   .pipe(
        //     filter((p) => !!p),
        //     take(1),
        //     takeUntil(this.destroyed$),
        //     takeUntil(this.markerTrack$.pipe(skip(1)))
        //   )
        //   .subscribe((player) => {
        player!.video.onVideoLoaded$
          .pipe(
            filter((p) => !!p),
            takeUntil(this.destroyed$),
            takeUntil(this.markerTrack$.pipe(skip(1)))
          )
          .subscribe(() => {
            this.createMarkerTrack();
          });
        // });
      });

    this.playerService.onCreated$.pipe(takeUntil(this.destroyed$)).subscribe((player) => {
      if (!player) {
        this.isVideoLoaded.set(false);
        return;
      }

      player.video.onVideoLoaded$.pipe(takeUntil(this.destroyed$)).subscribe((videoLoadedEvent) => {
        if (!videoLoadedEvent || videoLoadedEvent?.video?.protocol === 'audio') {
          this.isVideoLoaded.set(false);
          return;
        }
        this.isVideoLoaded.set(true);
      });
    });
  }

  public changeSelectedTheme(theme: string) {
    this.simpleLayoutConfigProviderService.setTheme(theme as SimpleLayoutTheme);
    const currentTime = this.playerService.omakasePlayer!.video.getCurrentTime();

    this.playerService.onCreated$
      .pipe(
        skip(1),
        filter((p) => !!p),
        take(1)
      )
      .subscribe((player) => {
        player.video.onVideoLoaded$
          .pipe(
            filter((p) => !!p),
            take(1)
          )
          .subscribe(() => {
            player.video.seekToTime(currentTime);
          });
      });
    this.sessionService.changeLayoutAndReloadMedia('simple');
  }

  private createMarkerTrack() {
    const player = this.playerService.omakasePlayer;
    const markerTrack = this.markerTrackService.activeMarkerTrack();
    if (!player) {
      console.warn("player is undefined, can't create marker list");
      return;
    }

    player.chroming.progressMarkerTrack?.removeAllMarkers();
    if (!markerTrack) {
      return;
    }

    const colorResolver = this.colorService.createColorResolver(crypto.randomUUID(), this.markerTrackService.HEX_COLORS);

    player.chroming.progressMarkerTrack?.loadVtt(markerTrack.src, {
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
