/*
 * Copyright 2024 ByOmakase, LLC (https://byomakase.org)
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

import {HelpMenuGroup, HelpMenuItem, OmakasePlayerApi} from '@byomakase/omakase-player';
import {UserAgent} from '../browser/window.service';

const playerPlaybackRateList = [0.25, 0.5, 0.75, 1, 2, 4, 8];

export class OmakasePlayerUtil {
  public static getKeyboardShortcutsHelpMenuGroup(platform: 'unknown' | 'macos' | 'windows' | 'linux'): HelpMenuGroup[] {
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

    let playbackHelpMenuItems: HelpMenuItem[] = [
      {
        description: 'Play / Pause',
        name: keyCombination('Space'),
      },

      {
        description: 'Toggle Sound',
        name: keyCombination('s'),
      },

      {
        description: 'Toggle Text On / Off',
        name: keyCombination('d'),
      },

      {
        description: 'Toggle Full Screen',
        name: keyCombination('f'),
      },

      {
        description: 'Increase Volume',
        name: keyCombination(shiftKey, '\\'),
      },

      {
        description: 'Reduce Volume',
        name: keyCombination('\\'),
      },

      {
        description: 'One Frame Forward',
        name: keyCombination('Right Arrow'),
      },

      {
        description: 'One Frame Backward',
        name: keyCombination('Left Arrow'),
      },

      {
        description: '10 Frames Forward',
        name: keyCombination(shiftKey, 'Right Arrow'),
      },

      {
        description: '10 Frames Backwards',
        name: keyCombination(shiftKey, 'Left Arrow'),
      },

      {
        description: 'Stop shuttle and pause',
        name: keyCombination('k'),
      },

      {
        description: 'Decrease Shuttle Forwards',
        name: keyCombination('l'),
      },

      {
        description: 'Increase Shuttle Forwards',
        name: keyCombination(shiftKey, 'l'),
      },

      {
        description: 'Set playhead to Start of Media and Stop',
        name: keyCombination('1 / Home'),
      },

      {
        description: 'Set playhead to End of Media and Stop',
        name: keyCombination(ctrlKey, '1') + ' / End',
      },
    ];

    return [
      {
        name: $localize`Playback Functions Shortcuts`,
        items: [...playbackHelpMenuItems],
      },
    ];
  }

  /**
   * Returns true if keyboard mapping was handled successfully or false if mapping was not handled
   *
   * @param event
   * @param omakasePlayer
   */
  public static handleKeyboardEvent(event: KeyboardEvent, omakasePlayer: OmakasePlayerApi, userAgent?: UserAgent): boolean {
    let config = {
      zoomStep: 200,
      volumeStep: 0.1,
    };

    const targetElement = event.target as HTMLElement;
    const formInputs = ['INPUT', 'TEXTAREA', 'OMAKASE-MARKER-LIST'];
    if (formInputs.includes(targetElement.tagName.toUpperCase())) {
      return false;
    }

    if (omakasePlayer && omakasePlayer.video) {
      //  Play / Pause
      if (event.code === 'Space' && (userAgent !== 'safari' || !omakasePlayer.video.isFullscreen())) {
        // enabled only in non-fullscreen mode for safari
        omakasePlayer.video.togglePlayPause();
        return true;
      }

      // Toggle Sound
      if (event.code === 'KeyS' && !event.shiftKey && !event.ctrlKey) {
        omakasePlayer.audio.toggleAudioOutputMuteUnmute();
        return true;
      }

      // Toggle Text On / Off
      if (event.code === 'KeyD' && !(event.ctrlKey && event.shiftKey)) {
        omakasePlayer.subtitles.toggleShowHideActiveTrack();
        return true;
      }

      // Reset shuttle
      if (event.code === 'KeyK') {
        omakasePlayer.video.setPlaybackRate(1);
        omakasePlayer.video.pause();
      }

      // Change shuttle
      if (event.code === 'KeyL') {
        let increaseOrDecrease = event.shiftKey ? 1 : -1;
        const playbackRateIndex = playerPlaybackRateList.indexOf(omakasePlayer.video.getPlaybackRate()) + increaseOrDecrease;
        let playbackRate;

        if (playbackRateIndex < 0) {
          playbackRate = playerPlaybackRateList.at(0);
        } else if (playbackRateIndex >= playerPlaybackRateList.length) {
          playbackRate = playerPlaybackRateList.at(-1);
        } else {
          playbackRate = playerPlaybackRateList.at(playbackRateIndex);
        }

        omakasePlayer.video.setPlaybackRate(playbackRate!);
        omakasePlayer.video.isPaused() && omakasePlayer.video.play();

        return true;
      }

      if (omakasePlayer.video.isVideoLoaded()) {
        // N Frames Forward / Backward
        if (['ArrowLeft', 'ArrowRight'].includes(event.key) && !event.metaKey && !event.altKey) {
          let upOrDown = event.key === 'ArrowRight' ? 1 : -1;
          let amount = event.shiftKey ? 10 : 1;

          if (omakasePlayer.video.isPlaying()) {
            omakasePlayer.video.pause();
          }

          omakasePlayer.video.seekFromCurrentFrame(amount * upOrDown);

          return true;
        }

        // Playhead Position to Start
        if ((event.code === 'Digit1' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) || event.code === 'Home') {
          omakasePlayer.video.pause().subscribe(() => omakasePlayer.video.seekToFrame(0));

          return true;
        }

        // Playhead Position to End
        if ((event.code === 'Digit1' && event.ctrlKey) || event.code === 'End') {
          if (omakasePlayer.video.isPlaying()) {
            omakasePlayer.video.pause().subscribe(() => omakasePlayer.video.seekToEnd());
          } else {
            omakasePlayer.video.seekToEnd();
          }
          return true;
        }
      }

      // Fullscreen
      if (event.code === 'KeyF') {
        omakasePlayer.video.toggleFullscreen();
        return true;
      }

      if (event.code === 'Backslash') {
        const amount = event.shiftKey ? config.volumeStep : -config.volumeStep;
        const newAudioOutputLevel = Math.min(Math.max(omakasePlayer.audio.getAudioOutputVolume() + amount, 0), 1);
        omakasePlayer.audio.setAudioOutputVolume(newAudioOutputLevel);
      }
    }

    return false;
  }

  public static getPlayerPlaybackRateList() {
    return playerPlaybackRateList;
  }
}
