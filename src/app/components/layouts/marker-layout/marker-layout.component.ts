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

import {Component, CUSTOM_ELEMENTS_SCHEMA, effect, HostListener, inject, OnDestroy, signal} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {MarkerTrack, MarkerTrackService} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {MarkerApi, MarkerTrackApi, MomentMarker, MomentObservation, OmakaseDropdown, OmakaseDropdownList, OmakaseDropdownToggle, PeriodMarker, PeriodObservation} from '@byomakase/omakase-player';
import {PlayerService} from '../../player/player.service';
import {filter, skip, Subject, take, takeUntil} from 'rxjs';
import {CueUtil} from '../../../common/util/cue-util';
import {MarkerListComponent} from '../../../common/marker-list/marker-list.component';
import {toObservable} from '@angular/core/rxjs-interop';
import {ColorService} from '../../../common/services/color.service';
import {MarkerShortcutUtil} from '../../../common/util/marker-shortcut-util';
import {MarkerTrackSelectComponent} from '../../../common/controls/marker-track-select/marker-track-select.component';
import {OmakaseDropdownListItem} from '@byomakase/omakase-player/dist/components/omakase-dropdown-list';
import {StringUtil} from '../../../common/util/string-util';

@Component({
  selector: 'app-marker-layout',
  imports: [PlayerComponent, IconDirective, MarkerListComponent],
  host: {'class': 'marker-layout'},
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="left-side">
      <div class="player-wrapper">
        <app-player></app-player>
        <template id="marker-select-slot">
          <media-control-bar>
            <omakase-marker-bar></omakase-marker-bar>
            <omakase-time-range></omakase-time-range>
          </media-control-bar>
        </template>
      </div>
    </div>
    <div class="right-side">
      @if (renderedMarkerTrack()) {
      <app-marker-list [source]="renderedMarkerTrack()" [readOnly]="markerTrackService.activeMarkerTrack()?.readOnly ?? true" />

      } @else {
      <div class="info-message">No marker tracks have been loaded. Click <i appIcon="pin"> </i>to load a marker track.</div>

      }
    </div>

    <template id="omakase-chroming-marker-track-select">
      <omakase-dropdown alignment="right" slot="dropdown-container" id="marker-track-dropdown">
        <omakase-dropdown-list type="radio" title="MARKER TRACKS" width="100" class="marker-track-dropdown-list" id="marker-track-dropdown-list"> </omakase-dropdown-list>
      </omakase-dropdown>
      <omakase-dropdown-toggle slot="end-container" class="marker-track-dropdown-toggle" dropdown="marker-track-dropdown">
        <media-chrome-button class="media-chrome-button">
          <span></span>
        </media-chrome-button>
      </omakase-dropdown-toggle>
    </template>
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
    effect(() => {
      const dropdownOptions: OmakaseDropdownListItem[] = this.markerTrackService.markerTracks().map((markerTrack) => {
        return {
          value: markerTrack.id,
          label: markerTrack.label ?? StringUtil.leafUrlToken(markerTrack.src),
          active: markerTrack.id === this.markerTrackService.activeMarkerTrack()?.id,
        };
      });

      this.playerService.onCreated$
        .pipe(
          filter((p) => !!p),
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
              const dropdown = this.playerService.omakasePlayer!.getPlayerChromingElement<OmakaseDropdownList>('#marker-track-dropdown-list');
              const dropdownToggle = this.playerService.omakasePlayer!.getPlayerChromingElement<OmakaseDropdownToggle>('.marker-track-dropdown-toggle');

              dropdown.setOptions(dropdownOptions);
              if (dropdownOptions.length === 0) {
                dropdownToggle.setAttribute('disabled', '');
              } else {
                dropdownToggle.removeAttribute('disabled');
              }
            });
        });
    });
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

    this.playerService.onCreated$
      .pipe(
        filter((p) => !!p),
        takeUntil(this.destroyed$)
      )
      .subscribe((player) => {
        player.video.onVideoLoaded$
          .pipe(
            filter((p) => !!p),
            takeUntil(this.destroyed$)
          )
          .subscribe(() => {
            const dropdown = this.playerService.omakasePlayer!.getPlayerChromingElement<OmakaseDropdownList>('#marker-track-dropdown-list');
            dropdown.selectedOption$.pipe(takeUntil(this.destroyed$)).subscribe((dropdownItem) => {
              if (dropdownItem) {
                this.markerTrackService.activeMarkerTrack.set(this.markerTrackService.markerTracks().find((markerTrack) => markerTrack.id === dropdownItem.value));
              }
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
