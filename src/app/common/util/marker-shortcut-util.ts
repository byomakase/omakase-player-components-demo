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

import {HelpMenuGroup, HelpMenuItem, Marker, MarkerTrack, OmakasePlayer, PlayerEventType, TimedItemTemporalType, TimedItemTemporalUtil} from '@byomakase/omakase-player';
import {filter, Subject, takeUntil} from 'rxjs';

export class MarkerShortcutUtil {
  public static getKeyboardShortcutsHelpMenuGroup(platform: 'unknown' | 'macos' | 'windows' | 'linux'): HelpMenuGroup {
    const shiftKey = 'SHIFT';

    const markerHelpMenuItems: HelpMenuItem[] = [
      {description: 'Toggle previous marker', name: '/'},
      {description: 'Toggle next marker', name: `${shiftKey} + /`},
      {description: 'Set start of active marker to current time', name: 'I'},
      {description: 'Set end of active marker to current time', name: 'O'},
      {description: 'Set playhead to start of active marker', name: '['},
      {description: 'Set playhead to end of active marker', name: ']'},
      {description: 'Loop active marker', name: 'P'},
    ];

    return {
      name: 'Marker Shortcuts',
      items: markerHelpMenuItems,
    };
  }

  /**
   * Returns true if the keyboard event was handled, false otherwise.
   */
  public static handleKeyboardEvent(event: KeyboardEvent, omakasePlayer: OmakasePlayer, markerTrack: MarkerTrack | undefined, focusMarker: (markerId: string) => void): boolean {
    const targetElement = event.target as HTMLElement;
    if (['INPUT', 'TEXTAREA'].includes(targetElement.tagName.toUpperCase())) {
      return false;
    }

    if (!omakasePlayer.player.mainMedia || !markerTrack) {
      return false;
    }

    const getFocusedMarker = (): Marker | undefined => {
      const focused = omakasePlayer.ui.elements.find((el) => el.props?.focused);
      return focused ? markerTrack.getTimedItem(focused.id) : undefined;
    };

    // Toggle previous marker
    if (event.code === 'Slash' && !event.shiftKey) {
      const markers = markerTrack.timedItemsSorted;
      if (!markers.length) return true;
      const focused = getFocusedMarker();
      if (!focused) {
        focusMarker(markers[0].id);
      } else {
        const index = markers.findIndex((m) => m.id === focused.id);
        focusMarker(markers.at((index + markers.length - 1) % markers.length)!.id);
      }
      return true;
    }

    // Toggle next marker
    if (event.code === 'Slash' && event.shiftKey) {
      const markers = markerTrack.timedItemsSorted;
      if (!markers.length) return true;
      const focused = getFocusedMarker();
      if (!focused) {
        focusMarker(markers[0].id);
      } else {
        const index = markers.findIndex((m) => m.id === focused.id);
        focusMarker(markers.at((index + 1) % markers.length)!.id);
      }
      return true;
    }

    // Set start of active marker to current time
    if (event.code === 'KeyI') {
      const focused = getFocusedMarker();
      if (focused) {
        const currentTime = omakasePlayer.player.getCurrentTime();
        const temporal = focused.temporal;
        if (temporal.type === TimedItemTemporalType.MOMENT) {
          markerTrack.updateTimedItem(focused.id, {temporal: {type: TimedItemTemporalType.MOMENT, time: String(currentTime)}});
        } else if (temporal.type === TimedItemTemporalType.SPAN) {
          const end = TimedItemTemporalUtil.extractEndTime(temporal)!;
          if (currentTime < end) {
            markerTrack.updateTimedItem(focused.id, {temporal: {type: TimedItemTemporalType.SPAN, start: String(currentTime), end: String(end)}});
          }
        }
      }
      return true;
    }

    // Set end of active marker to current time
    if (event.code === 'KeyO') {
      const focused = getFocusedMarker();
      if (focused) {
        const currentTime = omakasePlayer.player.getCurrentTime();
        const temporal = focused.temporal;
        if (temporal.type === TimedItemTemporalType.MOMENT) {
          markerTrack.updateTimedItem(focused.id, {temporal: {type: TimedItemTemporalType.MOMENT, time: String(currentTime)}});
        } else if (temporal.type === TimedItemTemporalType.SPAN) {
          const start = TimedItemTemporalUtil.extractStartTime(temporal)!;
          if (currentTime > start) {
            markerTrack.updateTimedItem(focused.id, {temporal: {type: TimedItemTemporalType.SPAN, start: String(start), end: String(currentTime)}});
          }
        }
      }
      return true;
    }

    // Set playhead to start of active marker
    if (event.code === 'BracketLeft') {
      const focused = getFocusedMarker();
      if (focused) {
        const start = TimedItemTemporalUtil.extractStartTime(focused.temporal);
        if (start != null) {
          omakasePlayer.player.seekTo(start).subscribe();
        }
      }
      return true;
    }

    // Set playhead to end of active marker
    if (event.code === 'BracketRight') {
      const focused = getFocusedMarker();
      if (focused) {
        const end = TimedItemTemporalUtil.extractEndTime(focused.temporal);
        if (end != null) {
          omakasePlayer.player.seekTo(end).subscribe();
        }
      }
      return true;
    }

    // Loop active marker
    if (event.code === 'KeyP') {
      const focused = getFocusedMarker();
      if (focused && focused.temporal.type === TimedItemTemporalType.SPAN) {
        const start = TimedItemTemporalUtil.extractStartTime(focused.temporal);
        const end = TimedItemTemporalUtil.extractEndTime(focused.temporal);
        if (start != null && end != null) {
          const loopBreaker$ = new Subject<void>();

          omakasePlayer.player.onEvent$
            .pipe(
              filter((e) => e.type === PlayerEventType.PLAYER_SEEKING),
              takeUntil(loopBreaker$)
            )
            .subscribe(() => {
              loopBreaker$.next();
              loopBreaker$.complete();
            });

          omakasePlayer.player.onEvent$
            .pipe(
              filter((e) => e.type === PlayerEventType.PLAYER_PLAYBACK_PROGRESS),
              takeUntil(loopBreaker$)
            )
            .subscribe((e) => {
              if (e.data.currentTime >= end) {
                loopBreaker$.next();
                loopBreaker$.complete();
                omakasePlayer.player.seekTo(start).subscribe(() => omakasePlayer.player.pause().subscribe());
              }
            });

          omakasePlayer.player.seekTo(start).subscribe(() => omakasePlayer.player.play().subscribe());
        }
      }
      return true;
    }

    return false;
  }
}
