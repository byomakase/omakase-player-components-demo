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

import {afterRender, AfterViewInit, Component, effect, inject, input, OnDestroy, output} from '@angular/core';
import {filter, Observable, skip, Subject, take, takeUntil} from 'rxjs';
import {toObservable} from '@angular/core/rxjs-interop';
import {PlayerService} from '../../components/player/player.service';
import {MarkerList, MarkerListEvent, MarkerState, MarkerTrack, PlayerEventType, TrackSource} from '@byomakase/omakase-player';
import {MarkerTrackService, SidecarMarkerTrack} from '../../components/fly-outs/add-markers-fly-out/marker-track.service';
import {ColorService} from '../services/color.service';

@Component({
  selector: 'app-marker-list',
  imports: [],
  host: {'class': 'marker-list'},
  template: `
    <div class="marker-list" id="marker-list-component"></div>

    <div style="display: none;">
      <div id="marker-list-header">
        <div class="flex-row">
          @if (playerService.thumbnailTrackUrl()) {
            <div class="header-cell" style="min-width:100px"></div>
          }
          <div class="header-cell header-cell-name" style="flex-grow:1">NAME</div>
          <div class="header-cell " style="width:120px;min-width:15%">IN</div>
          <div class="header-cell " style="width:120px;min-width:15%">OUT</div>
          <div class="header-cell " style="width:120px;min-width:15%">DURATION</div>

          @if (!readOnly()) {
            <div class="header-cell" style="width:30px;padding-right:1em"></div>
          }
        </div>
      </div>
      <div id="marker-list-row">
        <div class="flex-row bordered">
          <div class="flex-cell" style="min-width: 5px;">
            <span slot="color" style="display:inline-block;height:53px;width:5px"></span>
          </div>
          @if (playerService.thumbnailTrackUrl()) {
            <div class="flex-cell" style="min-width: 100px">
              <img slot="thumbnail" height="60" />
            </div>
          }
          <div class="flex-cell flex-cell-name " style="flex-grow:1" slot="name"></div>
          <div class="flex-cell " style="width:120px;min-width:15%" slot="start"></div>
          <div class="flex-cell " style="width:120px;min-width:15%" slot="end"></div>
          <div class="flex-cell " style="width:120px;min-width:15%" slot="duration"></div>

          @if (!readOnly()) {
            <div class="flex-cell flex-cell-buttons" style="min-width:30px;text-align:center">
              <span class="icon-delete" slot="remove"></span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class MarkerListComponent implements OnDestroy, AfterViewInit {
  source = input<SidecarMarkerTrack>();
  readOnly = input<boolean>(true);
  limitHeight = input<boolean>(false);
  markerListEvent = output<MarkerListEvent>();
  public playerService = inject(PlayerService);
  private destroyed$ = new Subject<void>();
  // replay subject with replay value of 1, first value should be skipped
  // inspected in angular source code, possibly subjected to change
  private source$ = toObservable<SidecarMarkerTrack | undefined>(this.source);
  private shouldRerenderMarkerList = false;
  private markerList: MarkerList | undefined = undefined;
  private colorService = inject(ColorService);
  private markerTrackService = inject(MarkerTrackService);

  constructor() {
    effect(() => {
      if (this.playerService.thumbnailTrack() && this.markerList) {
        this.markerList.thumbnailTrack = this.playerService.thumbnailTrack();
      }
    });
    afterRender(() => {
      if (this.shouldRerenderMarkerList) {
        this.createMarkerList();
        this.shouldRerenderMarkerList = false;
      }
    });
  }
  ngOnDestroy(): void {
    this.markerList?.destroy();
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  ngAfterViewInit(): void {
    this.source$.subscribe(() => {
      this.playerService.onCreated$
        .pipe(
          filter((p) => !!p),
          take(1),
          takeUntil(this.destroyed$),
          takeUntil(this.source$.pipe(skip(1)))
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
            this.shouldRerenderMarkerList = true;
          });
        });
    });
  }

  private createMarkerList() {
    const player = this.playerService.omakasePlayer;
    const source = this.source();
    if (!player) {
      console.warn("player is undefined, can't create marker list");
      return;
    }

    if (!source || !source.id) {
      return;
    }

    const markerTrack = player.track.get(source.id)! as MarkerTrack;

    this.markerList?.destroy();

    this.markerList = new MarkerList(
      {
        markerListHTMLElementId: 'marker-list-component',
        templateHTMLElementId: 'marker-list-row',
        headerHTMLElementId: 'marker-list-header',
        styleUrl: this.resolveCssUrl(),
        markerTrack: [{source: TrackSource.of(markerTrack.id)}],
        thumbnailTrack: this.playerService.thumbnailTrack() ? {source: TrackSource.of(this.playerService.thumbnailTrack()!.id)} : undefined,
        timeEditable: !this.readOnly(),
        labelEditable: !this.readOnly(),
      },
      player
    );

    this.markerList.onEvent$.pipe(takeUntil(this.destroyed$)).subscribe((event) => {
      this.markerListEvent.emit(event);
    });
  }

  private resolveCssUrl(): string {
    if (this.limitHeight()) {
      return '/assets/css/marker-list-limited-height.css';
    } else {
      return '/assets/css/marker-list.css';
    }
  }
}
