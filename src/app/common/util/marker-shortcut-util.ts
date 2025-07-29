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

import {HelpMenuGroup, HelpMenuItem, MarkerAwareApi, OmakasePlayerApi} from '@byomakase/omakase-player';
import {filter, Subject, takeUntil} from 'rxjs';

export class MarkerShortcutUtil {
  public static getKeyboardShortcutsHelpMenuGroup(platform: 'unknown' | 'macos' | 'windows' | 'linux'): HelpMenuGroup {
    let keyCombination = (...keys: string[]) => {
      return keys.join(' + ');
    };

    let multipleCombinations = (...keys: string[]) => {
      return keys.join(', ');
    };

    let shiftKey = 'shift'.toUpperCase();
    let ctrlKey = 'ctrl'.toUpperCase();
    let altKey = platform === 'macos' ? 'option' : 'alt';
    let metaKey = platform === 'windows' ? 'win' : platform === 'linux' ? 'super' : 'cmd';

    let markerHelpMenuItems: HelpMenuItem[] = [
      {
        description: 'Toggle previous marker',
        name: keyCombination('/'),
      },

      {
        description: 'Toggle next marker',
        name: keyCombination(shiftKey, '/'),
      },

      {
        description: 'Set end of active marker to current time',
        name: keyCombination('i'),
      },

      {
        description: 'Set end of active marker to current time',
        name: keyCombination('0'),
      },

      {
        description: 'Set playhead to start of active marker',
        name: keyCombination('['),
      },

      {
        description: 'Set playhead to end of active Marker',
        name: keyCombination(']'),
      },

      {
        description: 'Loop active marker',
        name: keyCombination('p'),
      },
    ];

    return {
      name: $localize`Marker Shortcuts`,
      items: [...markerHelpMenuItems],
    };
  }

  /**
   * Returns true if keyboard mapping was handled successfully or false if mapping was not handled
   *
   * @param event
   * @param omakasePlayer
   */
  public static handleKeyboardEvent(event: KeyboardEvent, omakasePlayer: OmakasePlayerApi, markerAwareApi: MarkerAwareApi | undefined): boolean {
    const targetElement = event.target as HTMLElement;
    const formInputs = ['INPUT', 'TEXTAREA', 'OMAKASE-MARKER-LIST'];
    if (formInputs.includes(targetElement.tagName.toUpperCase())) {
      return false;
    }

    if (omakasePlayer && omakasePlayer.video && markerAwareApi) {
      //  Toggle previous marker
      if (event.code === 'Slash' && !event.shiftKey) {
        // enabled only in non-fullscreen mode for safari
        const selectedMarker = markerAwareApi.getSelectedMarker();
        if (!selectedMarker) {
          const firstMarker = markerAwareApi.getMarkers().at(0);
          if (firstMarker) {
            markerAwareApi.toggleMarker(firstMarker.id);
          }
        } else {
          const markers = markerAwareApi.getMarkers();
          const index = markers.findIndex((marker) => marker.id === selectedMarker.id);
          markerAwareApi.toggleMarker(markers.at((index + markers.length - 1) % markers.length)!.id);
        }

        return true;
      }

      // Toggle next marker
      if (event.code === 'Slash' && event.shiftKey) {
        const selectedMarker = markerAwareApi.getSelectedMarker();
        if (!selectedMarker) {
          const firstMarker = markerAwareApi.getMarkers().at(0);
          if (firstMarker) {
            markerAwareApi.toggleMarker(firstMarker.id);
          }
        } else {
          const markers = markerAwareApi.getMarkers();
          const index = markers.findIndex((marker) => marker.id === selectedMarker.id);
          markerAwareApi.toggleMarker(markers.at((index + markers.length + 1) % markers.length)!.id);
        }

        return true;
      }

      // Set Start of Active Marker to Playhead Position
      if (event.code === 'KeyI' && !event.metaKey) {
        const selectedMarker = markerAwareApi.getSelectedMarker();
        if (selectedMarker && selectedMarker.editable) {
          const currentVideoTime = omakasePlayer.video.getCurrentTime();

          if ('time' in selectedMarker.timeObservation) {
            selectedMarker.timeObservation = {time: currentVideoTime};
          } else {
            const end = selectedMarker.timeObservation.end;

            if (end != undefined && end > currentVideoTime) {
              selectedMarker.timeObservation = {start: currentVideoTime, end: end};
            }
          }
        }

        return true;
      }

      // Set End of Active Marker to Playhead Position
      if (event.code === 'KeyO') {
        const selectedMarker = markerAwareApi.getSelectedMarker();
        if (selectedMarker && selectedMarker.editable) {
          const currentVideoTime = omakasePlayer.video.getCurrentTime();

          if ('time' in selectedMarker.timeObservation) {
            selectedMarker.timeObservation = {time: currentVideoTime};
          } else {
            const start = selectedMarker.timeObservation.start;

            if (start != undefined && start < currentVideoTime) {
              selectedMarker.timeObservation = {start: start, end: currentVideoTime};
            }
          }
        }

        return true;
      }

      //Set Playhead to Start of Active Marker
      if (event.code === 'BracketLeft') {
        const selectedMarker = markerAwareApi.getSelectedMarker();
        if (selectedMarker) {
          if ('time' in selectedMarker.timeObservation) {
            omakasePlayer.video.seekToTime(selectedMarker.timeObservation.time);
          } else {
            const start = selectedMarker.timeObservation.start;

            if (start != undefined) {
              omakasePlayer.video.seekToTime(start);
            }
          }
        }

        return true;
      }

      //Set Playhead to end of Active Marker
      if (event.code === 'BracketRight') {
        const selectedMarker = markerAwareApi.getSelectedMarker();
        if (selectedMarker) {
          if ('time' in selectedMarker.timeObservation) {
            omakasePlayer.video.seekToTime(selectedMarker.timeObservation.time);
          } else {
            const end = selectedMarker.timeObservation.end;

            if (end != undefined) {
              omakasePlayer.video.seekToTime(end);
            }
          }
        }

        return true;
      }

      // Loop active marker
      if (event.code === 'KeyP') {
        const selectedMarker = markerAwareApi.getSelectedMarker();
        if (selectedMarker) {
          if ('start' in selectedMarker.timeObservation && 'end' in selectedMarker.timeObservation) {
            const start = selectedMarker.timeObservation.start;
            const end = selectedMarker.timeObservation.end;
            if (start != undefined && end != undefined) {
              const playBreaker$ = new Subject<void>();

              omakasePlayer.video.seekToTime(start).subscribe(() => {
                omakasePlayer.video.onSeeking$.subscribe(() => {
                  playBreaker$.next();
                  playBreaker$.complete();
                });
              });
              omakasePlayer.video.play();

              markerAwareApi.onMarkerUpdate$
                .pipe(
                  filter((markerUpdateEvent) => markerUpdateEvent.marker.id === selectedMarker.id),
                  takeUntil(playBreaker$)
                )
                .subscribe(() => {
                  playBreaker$.next();
                  playBreaker$.complete();
                });
              omakasePlayer.video.onVideoTimeChange$.pipe(takeUntil(playBreaker$)).subscribe((videoTimeChangedEvent) => {
                if (videoTimeChangedEvent.currentTime >= end) {
                  playBreaker$.next();
                  playBreaker$.complete();
                  omakasePlayer.video.seekToTime(start).subscribe(() => omakasePlayer.video.pause());
                }
              });
            }
          } else {
          }
        }

        return true;
      }

      return false;
    }

    return false;
  }
}
