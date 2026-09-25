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

import {Component, computed, inject, OnDestroy, signal, ChangeDetectionStrategy} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {toObservable} from '@angular/core/rxjs-interop';
import {Subject, filter, take, takeUntil, skip, BehaviorSubject, combineLatest, Observable, switchMap, EMPTY} from 'rxjs';
import {MarkerTrackService, SidecarMarkerTrack} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {PlayerService} from '../../player/player.service';
import {ColorService} from '../../../common/services/color.service';
import {MarkerTrackSelectComponent} from '../../../common/controls/marker-track-select/marker-track-select.component';
import {SimpleLayoutConfigProviderService, SimpleLayoutTheme} from '../../layout-menu/config-providers/simple-layout-config-provider.service';
import {ThemeSelectComponent} from '../../../common/controls/theme-select/theme-select.component';
import {SessionService} from '../../../common/session/session.service';
import {ChromingMarkerBarHandlerApi, ChromingTrackDestination, PlayerEventType, TrackSource, TrackType} from '@byomakase/omakase-player';

@Component({
  selector: 'app-simple-layout',
  imports: [PlayerComponent, MarkerTrackSelectComponent, ThemeSelectComponent],
  host: {'class': 'simple-layout'},
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="player-wrapper">
      <app-player></app-player>
      <div class="selects-container" [style.margin-top]="calculatedSelectsContainerMarginTop()">
        @if (isVideoLoaded()) {
          <app-theme-select [themes]="themes" [initiallySelectedTheme]="simpleLayoutConfigProviderService.getTheme()" (themeSelect)="changeSelectedTheme($event)" />
        }
        @if (markerTrackService.markerTracks().length > 1) {
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
  private markerTrack$ = toObservable<SidecarMarkerTrack | undefined>(this.markerTrackService.activeMarkerTrack);
  private renderedMarkerTrack = signal<ChromingMarkerBarHandlerApi | undefined>(undefined);
  private playerService = inject(PlayerService);
  private sessionService = inject(SessionService);
  public isVideoLoaded = signal<boolean>(false);

  public themes = [...this.simpleLayoutConfigProviderService.themes];

  public currentTheme = signal<SimpleLayoutTheme>(this.simpleLayoutConfigProviderService.getTheme());
  public calculatedSelectsContainerMarginTop = computed(() => {
    if (this.currentTheme() !== 'omakase') {
      return '1em';
    }

    return '2em';
  });

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  constructor() {
    combineLatest([this.markerTrack$, this.playerService.onCreated$])
      .pipe(
        takeUntil(this.destroyed$),
        // switchMap so a newer emission (e.g. the marker track being removed while a new
        // main media loads) cancels any pending "create on main media loaded" from a prior
        // emission. Otherwise a removed marker track gets re-added to chroming once the new
        // media finishes loading.
        switchMap(([markerTrack, omakasePlayer]) => {
          if (!omakasePlayer || !markerTrack) {
            if (omakasePlayer && this.renderedMarkerTrack()) {
              omakasePlayer.chroming.deleteMarkerBar(this.renderedMarkerTrack()!.id);
            }
            this.renderedMarkerTrack.set(undefined);
            return EMPTY;
          }

          return new Observable<SidecarMarkerTrack>((observer) => {
            if (omakasePlayer.player.mainMedia) {
              observer.next(markerTrack);
              observer.complete();
              return;
            }
            const sub = omakasePlayer.player.onEvent$
              .pipe(
                filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_LOADED),
                take(1)
              )
              .subscribe(() => {
                observer.next(markerTrack);
                observer.complete();
              });
            return () => sub.unsubscribe();
          });
        })
      )
      .subscribe((markerTrack) => {
        this.createMarkerTrack(markerTrack);

        // this.playerService.onCreated$
        //   .pipe(
        //     filter((p) => !!p),
        //     take(1),
        //     takeUntil(this.destroyed$),
        //     takeUntil(this.markerTrack$.pipe(skip(1)))
        //   )
        //   .subscribe((player) => {
        // player!.video.onVideoLoaded$
        //   .pipe(
        //     filter((p) => !!p),
        //     takeUntil(this.destroyed$),
        //     takeUntil(this.markerTrack$.pipe(skip(1)))
        //   )
        //   .subscribe(() => {
        //     this.createMarkerTrack();
        //   });
        // });
      });

    this.playerService.onCreated$.pipe(takeUntil(this.destroyed$)).subscribe((omakasePlayer) => {
      if (!omakasePlayer) {
        this.isVideoLoaded.set(false);
        return;
      }
      const o$ = new Observable<void>((observer) => {
        if (omakasePlayer.player.mainMedia) {
          observer.next();
          observer.complete();
        } else {
          omakasePlayer.player.onEvent$
            .pipe(
              filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_LOADED),
              take(1)
            )
            .subscribe(() => {
              observer.next();
              observer.complete();
            });
        }
      });
      o$.subscribe(() => {
        this.isVideoLoaded.set(true);
      });
    });
  }

  public changeSelectedTheme(theme: string) {
    this.simpleLayoutConfigProviderService.setTheme(theme as SimpleLayoutTheme);
    this.currentTheme.set(theme as SimpleLayoutTheme);
    const currentTime = this.playerService.omakasePlayer!.player.getCurrentTime();

    this.playerService.onCreated$
      .pipe(
        skip(1),
        filter((p) => !!p),
        take(1)
      )
      .subscribe((omakasePlayer) => {
        const o$ = new Observable<void>((observer) => {
          if (omakasePlayer.player.mainMedia) {
            observer.next();
            observer.complete();
          } else {
            omakasePlayer.player.onEvent$
              .pipe(
                filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_LOADED),
                take(1)
              )
              .subscribe(() => {
                observer.next();
                observer.complete();
              });
          }
        });
        o$.subscribe(() => {
          omakasePlayer.player.seekTo(currentTime);
        });
      });
    this.sessionService.changeLayoutAndReloadMedia('simple');
  }

  private createMarkerTrack(markerTrack: SidecarMarkerTrack) {
    const omakasePlayer = this.playerService.omakasePlayer;
    if (!omakasePlayer) {
      console.warn("player is undefined, can't create marker list");
      return;
    }

    if (this.renderedMarkerTrack()) {
      // omakasePlayer.chroming.deleteMarkerTrack(this.renderedMarkerTrack()!.id);
    }

    omakasePlayer.chroming
      .addMarkerBar(
        TrackSource.of(markerTrack.id!),
        ChromingTrackDestination.PROGRESS_BAR,
        {trackType: TrackType.MARKER_TRACK},
        {
          visible: true,
        }
      )
      .subscribe((markerTrack) => {
        this.renderedMarkerTrack.set(markerTrack);

        // markerTrack.onEvent$.pipe(filter((event) => event.type === Chrom))
        // markerTrack.onMarkerSelected$.subscribe((markerSelectedEvent) => {
        //   if (markerSelectedEvent.marker) {
        //     this.seekToMarker(markerSelectedEvent.marker);
        //   }
        // });
      });
  }
}
