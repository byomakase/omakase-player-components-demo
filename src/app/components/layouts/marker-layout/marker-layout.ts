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

import {Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, HostListener, inject, OnDestroy, signal, ChangeDetectionStrategy} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {MarkerTrackService, SidecarMarkerTrack} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {PlayerService} from '../../player/player.service';
import {filter, Observable, of, skip, Subject, takeUntil} from 'rxjs';
import {CueUtil} from '../../../common/util/cue-util';
import {toObservable} from '@angular/core/rxjs-interop';
import {ColorService} from '../../../common/services/color.service';
import {MarkerShortcutUtil} from '../../../common/util/marker-shortcut-util';
import {StringUtil} from '../../../common/util/string-util';
import {
  MarkerListEvent,
  MarkerListEventType,
  MarkerOnMarkerListStyle,
  PlayerEventType,
  TimedItemTemporalUtil,
  TrackSource,
  TrackType,
  ChromingMarkerBarHandlerApi,
  ChromingMarkerBarEventType,
  OmakaseDropdownList,
  OmakaseDropdownToggle,
  ChromingTrackDestination,
  MarkerTrack,
  UiEventType,
  MarkerOnChromingStyle,
  HelpMenuGroupInsertPosition,
} from '@byomakase/omakase-player';
import {MarkerListComponent} from '../../../common/marker-list/marker-list.component';

@Component({
  selector: 'app-marker-layout',
  imports: [PlayerComponent, IconDirective, MarkerListComponent],
  host: {'class': 'marker-layout'},
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.Eager,
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
        <app-marker-list [source]="markerTrackService.activeMarkerTrack()" [readOnly]="markerTrackService.activeMarkerTrack()?.readOnly ?? true" (markerListEvent)="onMarkerListEvent($event)" />
      } @else {
        <div class="info-message">No marker tracks have been loaded. Click <i appIcon="pin"> </i>to load a marker track.</div>
      }
    </div>

    <template id="omakase-chroming-marker-track-select">
      <omakase-dropdown alignment="left" slot="dropdown-container" id="marker-track-dropdown">
        <omakase-dropdown-list type="radio" title="MARKER TRACKS" width="200" class="marker-track-dropdown-list" id="marker-track-dropdown-list"> </omakase-dropdown-list>
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
  public renderedMarkerTrackChromingHandler = signal<ChromingMarkerBarHandlerApi | undefined>(undefined);
  public renderedMarkerTrack = computed(() => {
    const chromingHandler = this.renderedMarkerTrackChromingHandler();
    if (chromingHandler) {
      const markerTrackId = chromingHandler.getTrackIds().at(0)!;
      return this.playerService.omakasePlayer!.track.get(markerTrackId)! as MarkerTrack;
    }

    return undefined;
  });
  private destroyed$ = new Subject<void>();

  // replay subject with replay value of 1, first value should be skipped
  // inspected in angular source code, possibly subjected to change
  private markerTrack$ = toObservable<SidecarMarkerTrack | undefined>(this.markerTrackService.activeMarkerTrack);

  private playerService = inject(PlayerService);
  private colorService = inject(ColorService);

  private appendedHelpMenuGroup = false;

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  constructor() {
    // const initiallyLoadedMarkerTracks = this.markerTrackService.loadedMarkerTracks();
    effect(() => {
      const dropdownOptions = this.markerTrackService.markerTracks().map((markerTrack) => {
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
        .subscribe((omakasePlayer) => {
          const o$ = new Observable<void>((observer) => {
            if (omakasePlayer.player.mainMedia) {
              observer.next();
              observer.complete();
            } else {
              omakasePlayer.player.onEvent$
                .pipe(
                  filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_LOADED),
                  takeUntil(this.destroyed$),
                  takeUntil(this.markerTrack$.pipe(skip(1)))
                )
                .subscribe(() => {
                  observer.next();
                  observer.complete();
                });
            }
          });

          omakasePlayer.ui.onEvent$
            .pipe(
              filter((event) => event.type === UiEventType.UI_ELEMENT_UPDATED),
              takeUntil(this.destroyed$)
            )
            .subscribe((event) => {
              const focused = !!event.data.element.props?.focused;
              omakasePlayer.ui.updateStyleRule<MarkerOnMarkerListStyle>({id: event.data.element.id, style: {highlightMarker: focused}});
              omakasePlayer.ui.updateStyleRule<MarkerOnChromingStyle>({id: event.data.element.id, style: {active: focused}});
            });

          o$.subscribe(() => {
            const dropdown = this.playerService.omakasePlayer!.chroming.getPlayerChromingElement<OmakaseDropdownList>('#marker-track-dropdown-list');
            const dropdownToggle = this.playerService.omakasePlayer!.chroming.getPlayerChromingElement<OmakaseDropdownToggle>('.marker-track-dropdown-toggle');
            dropdown.setOptions(dropdownOptions);
            if (dropdownOptions.length === 0) {
              dropdownToggle.setAttribute('disabled', '');
            } else {
              dropdownToggle.removeAttribute('disabled');
            }
            dropdown.selectedOption$.pipe(takeUntil(this.destroyed$)).subscribe((dropdownItem) => {
              if (dropdownItem) {
                this.markerTrackService.activeMarkerTrack.set(this.markerTrackService.markerTracks().find((markerTrack) => markerTrack.id === dropdownItem.value));
              }
            });
            // initiallyLoadedMarkerTracks.forEach((markerTrack) => this.createMarkerTrack(markerTrack));
          });
          //   omakasePlayer.player.onEvent$
          //     .pipe(
          //       filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_LOADED),
          //       takeUntil(this.destroyed$),
          //       takeUntil(this.markerTrack$.pipe(skip(1)))
          //     )
          //     .subscribe(() => {
          //       const dropdown = this.playerService.omakasePlayer!.chroming.getPlayerChromingElement('#marker-track-dropdown-list') as any;
          //       const dropdownToggle = this.playerService.omakasePlayer!.chroming.getPlayerChromingElement('.marker-track-dropdown-toggle') as any;

          //       dropdown.setOptions(dropdownOptions);
          //       if (dropdownOptions.length === 0) {
          //         dropdownToggle.setAttribute('disabled', '');
          //       } else {
          //         dropdownToggle.removeAttribute('disabled');
          //       }
          //     });
        });
    });
    this.markerTrack$.subscribe((markerTrack) => {
      if (!markerTrack) {
        this.playerService.omakasePlayer?.chroming.deleteMarkerBar(ChromingTrackDestination.MARKER_BARS);
        this.renderedMarkerTrackChromingHandler.set(undefined);
        return;
      }
      this.createMarkerTrack(markerTrack);

      //   this.playerService.onCreated$
      //     .pipe(
      //       filter((p) => !!p),
      //       take(1),
      //       takeUntil(this.destroyed$),
      //       takeUntil(this.markerTrack$.pipe(skip(1)))
      //     )
      //     .subscribe((omakasePlayer) => {
      //       omakasePlayer.player.onVideoLoaded$
      //         .pipe(
      //           filter((p) => !!p),
      //           takeUntil(this.destroyed$),
      //           takeUntil(this.markerTrack$.pipe(skip(1)))
      //         )
      //         .subscribe(() => {
      //           if (!this.appendedHelpMenuGroup) {
      //             omakasePlayer.video.appendHelpMenuGroup(MarkerShortcutUtil.getKeyboardShortcutsHelpMenuGroup('unknown'));
      //             this.appendedHelpMenuGroup = true;
      //           }
      //           this.createMarkerTrack();
      //         });
      //     });
    });

    this.playerService.onCreated$
      .pipe(
        filter((p) => !!p),
        takeUntil(this.destroyed$)
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
                takeUntil(this.destroyed$),
                takeUntil(this.markerTrack$.pipe(skip(1)))
              )
              .subscribe(() => {
                observer.next();
                observer.complete();
              });
          }
        });
        o$.subscribe(() => {
          const dropdown = this.playerService.omakasePlayer!.chroming.getPlayerChromingElement<OmakaseDropdownList>('#marker-track-dropdown-list');
          dropdown.selectedOption$.pipe(takeUntil(this.destroyed$)).subscribe((dropdownItem) => {
            if (dropdownItem) {
              this.markerTrackService.activeMarkerTrack.set(this.markerTrackService.markerTracks().find((markerTrack) => markerTrack.id === dropdownItem.value));
            }
          });
        });
      });

    this.playerService
      .observeMediaLoads(this.destroyed$)
      .pipe(takeUntil(this.destroyed$))
      .subscribe((omakasePlayer) => {
        if (!omakasePlayer) {
          this.appendedHelpMenuGroup = false;
          return;
        }
        if (!this.appendedHelpMenuGroup) {
          omakasePlayer.chroming.addHelpMenuGroup(MarkerShortcutUtil.getKeyboardShortcutsHelpMenuGroup('unknown'), HelpMenuGroupInsertPosition.APPEND);
          this.appendedHelpMenuGroup = true;
        }
      });
  }

  private createMarkerTrack(markerTrack: SidecarMarkerTrack) {
    const omakasePlayer = this.playerService.omakasePlayer;
    if (!omakasePlayer) {
      console.warn("player is undefined, can't create marker list");
      return;
    }

    if (this.renderedMarkerTrackChromingHandler()) {
      omakasePlayer.chroming.deleteMarkerBar(this.renderedMarkerTrackChromingHandler()!.id);
    }

    omakasePlayer.chroming
      .addMarkerBar(
        TrackSource.of(markerTrack.id!),
        ChromingTrackDestination.MARKER_BARS,
        {trackType: TrackType.MARKER_TRACK},
        {
          visible: true,
        }
      )
      .subscribe((chromingHandler) => {
        this.renderedMarkerTrackChromingHandler.set(chromingHandler);

        chromingHandler.onEvent$
          .pipe(
            filter((event) => event.type === ChromingMarkerBarEventType.CHROMING_MARKER_BAR_ITEM_CLICK),
            takeUntil(this.destroyed$)
          )
          .subscribe((event) => {
            this.onMarkerClick(event.data.item.id);
          });
      });
  }

  //   seekToMarker(marker: MarkerApi) {
  //     const timeObservation = marker.timeObservation;
  //     let start;

  //     if ('start' in timeObservation) {
  //       start = (timeObservation as PeriodObservation).start!;
  //     } else {
  //       start = (timeObservation as MomentObservation).time;
  //     }

  //     // return this.playerService.omakasePlayer!.video.pause().subscribe(() => this.playerService.omakasePlayer!.video.seekToTime(start));
  //   }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    if (this.playerService.omakasePlayer) {
      const handled = MarkerShortcutUtil.handleKeyboardEvent(event, this.playerService.omakasePlayer, this.renderedMarkerTrack(), (markerId) => this.setMarkerFocus(markerId));
      if (handled) {
        event.preventDefault();
      }
    }
  }

  onMarkerListEvent(event: MarkerListEvent) {
    if (event.type !== MarkerListEventType.MARKER_LIST_ITEM_CLICK) {
      return;
    }
    this.onMarkerClick(event.data.item.id);
  }

  onMarkerClick(markerId: string) {
    const omakasePlayer = this.playerService.omakasePlayer;
    if (!omakasePlayer) return;

    this.setMarkerFocus(markerId);

    const markerTrack = this.renderedMarkerTrack();
    const marker = markerTrack?.getTimedItem(markerId);
    if (!marker) return;

    const start = TimedItemTemporalUtil.extractStartTime(marker.temporal);
    if (start == null) return;

    const duration = omakasePlayer.player.mainMedia?.state.duration ?? 0;
    if (start > duration) return;

    const pause$ = omakasePlayer.player.playerSession.playback.playing ? omakasePlayer.player.pause() : of(undefined);
    pause$.subscribe(() => omakasePlayer.player.seekTo(start).subscribe());
  }

  private setMarkerFocus(markerId: string) {
    const ui = this.playerService.omakasePlayer!.ui;
    const activeElement = ui.elements.find((element) => element.props?.focused);
    if (activeElement) {
      ui.updateElement({id: activeElement.id, props: {focused: void 0}});
    }
    if (markerId !== activeElement?.id) {
      ui.updateElement({id: markerId, props: {focused: true}});
    }
  }
}
