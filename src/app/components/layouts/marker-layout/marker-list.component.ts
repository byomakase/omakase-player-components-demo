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

import {Component, effect, inject, input, OnDestroy} from '@angular/core';
import {MarkerTrack} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {PlayerService} from '../../player/player.service';
import {MarkerApi, MomentMarker, MomentObservation, PeriodMarker, PeriodObservation} from '@byomakase/omakase-player';
import {filter, skip, Subject, take, takeUntil} from 'rxjs';
import {StringUtil} from '../../../common/util/string-util';
import {MarkerTrackApi} from '@byomakase/omakase-player/dist/api/marker-track-api';
import {toObservable} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-marker-list',
  imports: [],
  host: {'class': 'marker-list'},
  template: `
    <div class="marker-list" id="marker-list-component"></div>

    <template id="segmentation-marker-list-header">
      <div class="flex-row">
        <div class="header-cell header-cell-name" style="flex-grow:1">NAME</div>
        <div class="header-cell " style="width:120px;min-width:15%">IN</div>
        <div class="header-cell " style="width:120px;min-width:15%">OUT</div>
        <div class="header-cell " style="width:120px;min-width:15%">DURATION</div>

        <div class="header-cell" style="width:30px;padding-right:1em"></div>
      </div>
    </template>
    <template id="segmentation-marker-list-row">
      <div class="flex-row bordered">
        <div class="flex-cell" style="min-width: 5px;">
          <span slot="color" style="display:inline-block;height:53px;width:5px"></span>
        </div>
        <div class="flex-cell flex-cell-name " style="flex-grow:1" slot="name"></div>
        <div class="flex-cell " style="width:120px;min-width:15%" slot="start"></div>
        <div class="flex-cell " style="width:120px;min-width:15%" slot="end"></div>
        <div class="flex-cell " style="width:120px;min-width:15%" slot="duration"></div>

        <div class="flex-cell flex-cell-buttons" style="min-width:30px;text-align:center">
          <span class="icon-delete" slot="remove"></span>
        </div>
      </div>
    </template>

    <template id="segmentation-marker-list-header-read-only">
      <div class="flex-row">
        <div class="header-cell header-cell-name" style="flex-grow:1">NAME</div>
        <div class="header-cell " style="width:120px;min-width:15%">IN</div>
        <div class="header-cell " style="width:120px;min-width:15%">OUT</div>
        <div class="header-cell " style="width:120px;min-width:15%">DURATION</div>
      </div>
    </template>
    <template id="segmentation-marker-list-row-read-only">
      <div class="flex-row bordered">
        <div class="flex-cell" style="min-width: 5px;">
          <span slot="color" style="display:inline-block;height:53px;width:5px"></span>
        </div>
        <div class="flex-cell flex-cell-name " style="flex-grow:1" slot="name"></div>
        <div class="flex-cell " style="width:120px;min-width:15%" slot="start"></div>
        <div class="flex-cell " style="width:120px;min-width:15%" slot="end"></div>
        <div class="flex-cell " style="width:120px;min-width:15%" slot="duration"></div>
      </div>
    </template>
  `,
})
export class MarkerListComponent implements OnDestroy {
  markerTrack = input<MarkerTrack>();
  private playerService = inject(PlayerService);
  private destroyed$ = new Subject<void>();
  // replay subject with replay value of 1, first value should be skipped
  // inspected in angular source code, possibly subjected to change
  private markerTrack$ = toObservable<MarkerTrack | undefined>(this.markerTrack);
  private renderedMarkerTrack: MarkerTrackApi | undefined = undefined;

  ngOnDestroy(): void {
    this.renderedMarkerTrack?.destroy();
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  constructor() {
    effect(() => {
      const markerTrack = this.markerTrack();

      if (!markerTrack) {
        this.renderedMarkerTrack?.destroy();
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
              this.createMarkerList();
            });
        });
    });
  }

  private extractName(cueText: string) {
    let text = StringUtil.extractComment(cueText);
    if (text === undefined) {
      text = cueText;
    }

    text = StringUtil.stripHtml(text).replace(/\n/g, ' ');
    text = StringUtil.stripJson(text);

    return text;
  }

  private createMarkerList() {
    const player = this.playerService.omakasePlayer;
    const markerTrack = this.markerTrack();
    if (!player) {
      console.warn("player is undefined, can't create marker list");
      return;
    }

    if (!markerTrack) {
      return;
    }

    this.renderedMarkerTrack?.destroy();

    console.log('calling createMArker list');

    player
      .createMarkerTrack({
        vttUrl: markerTrack.src,
        vttMarkerCreateFn: (cue, index) => {
          const name = this.extractName(cue.text);
          if (cue.endTime - cue.startTime < 1) {
            return new MomentMarker({
              timeObservation: {
                time: cue.startTime,
              },
              style: {
                color: markerTrack.color,
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
                color: markerTrack.color,
              },
              editable: !markerTrack.readOnly,
              text: name === '' ? `Marker ${index + 1}` : name,
            });
          }
        },
      })
      .subscribe((markerTrackApi) => {
        this.renderedMarkerTrack = markerTrackApi;

        markerTrackApi.onMarkerSelected$.subscribe((markerSelectedEvent) => {
          if (markerSelectedEvent.marker) {
            this.seekToMarker(markerSelectedEvent.marker);
          }
        });

        player
          .createMarkerList({
            markerListHTMLElementId: 'marker-list-component',
            templateHTMLElementId: markerTrack.readOnly ? 'segmentation-marker-list-row-read-only' : 'segmentation-marker-list-row',
            headerHTMLElementId: markerTrack.readOnly ? 'segmentation-marker-list-header-read-only' : 'segmentation-marker-list-header',
            styleUrl: '/assets/css/marker-list.css',
            source: [markerTrackApi],
            nameEditable: !markerTrack.readOnly,
            timeEditable: !markerTrack.readOnly,
          })
          .subscribe((markerList) => {
            markerList.onMarkerClick$.subscribe((markerListClickEvent) => {
              markerList.toggleMarker(markerListClickEvent.marker.id);
            });
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
}
