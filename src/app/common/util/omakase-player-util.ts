// /*
//  * Copyright 2024 ByOmakase, LLC (https://byomakase.org)
//  *
//  * Licensed under the Apache License, Version 2.0 (the "License");
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *     http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */

import {HelpMenuGroup, HelpMenuItem, MediaTemporalFormat, OmakasePlayerApi, PlayerAudioType} from '@byomakase/omakase-player';
import {UserAgent} from '../browser/window.service';

const playerPlaybackRateList = [0.25, 0.5, 0.75, 1, 2, 4, 8];

export class OmakasePlayerUtil {
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
    return {
      name: $localize`Playback Functions Shortcuts`,
      items: [...playbackHelpMenuItems],
    };
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
    if (omakasePlayer && omakasePlayer.player.mainMedia) {
      const outputHandler = omakasePlayer.player.audio.getHandler(PlayerAudioType.OUTPUT)!;
      //  Play / Pause
      if (event.code === 'Space' && (userAgent !== 'safari' || !omakasePlayer.player.isFullScreen())) {
        // enabled only in non-fullscreen mode for safari
        omakasePlayer.player.playerSession.playback.paused ? omakasePlayer.player.play() : omakasePlayer.player.pause();
        return true;
      }
      // Toggle Sound
      if (event.code === 'KeyS' && !event.shiftKey && !event.ctrlKey) {
        outputHandler.muted ? outputHandler.unmute() : outputHandler.mute();
        return true;
      }
      // Toggle Text On / Off
      if (event.code === 'KeyD' && !(event.ctrlKey && event.shiftKey)) {
        omakasePlayer.player.text.toggleShowHide();
        return true;
      }
      // Reset shuttle
      if (event.code === 'KeyK') {
        omakasePlayer.player.setPlaybackRate(1);
        omakasePlayer.player.pause();
      }
      // Change shuttle
      if (event.code === 'KeyL') {
        let increaseOrDecrease = event.shiftKey ? 1 : -1;
        const playbackRateIndex = playerPlaybackRateList.indexOf(omakasePlayer.player.playerSession.playback.playbackRate) + increaseOrDecrease;
        let playbackRate;
        if (playbackRateIndex < 0) {
          playbackRate = playerPlaybackRateList.at(0);
        } else if (playbackRateIndex >= playerPlaybackRateList.length) {
          playbackRate = playerPlaybackRateList.at(-1);
        } else {
          playbackRate = playerPlaybackRateList.at(playbackRateIndex);
        }
        omakasePlayer.player.setPlaybackRate(playbackRate!);
        omakasePlayer.player.playerSession.playback.paused && omakasePlayer.player.play();
        return true;
      }
      if (omakasePlayer.player.mainMedia) {
        // N Frames Forward / Backward
        if (['ArrowLeft', 'ArrowRight'].includes(event.key) && !event.metaKey && !event.altKey) {
          let upOrDown = event.key === 'ArrowRight' ? 1 : -1;
          let amount = event.shiftKey ? 10 : 1;
          if (omakasePlayer.player.playerSession.playback.playing) {
            omakasePlayer.player.pause();
          }
          omakasePlayer.player.seekFromCurrentTime(amount * upOrDown, MediaTemporalFormat.FRAME_COUNT);
          return true;
        }
        // Playhead Position to Start
        if ((event.code === 'Digit1' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) || event.code === 'Home') {
          omakasePlayer.player.pause().subscribe(() => omakasePlayer.player.seekTo(0, MediaTemporalFormat.FRAME_COUNT));
          return true;
        }
        // Playhead Position to End
        if ((event.code === 'Digit1' && event.ctrlKey) || event.code === 'End') {
          if (omakasePlayer.player.playerSession.playback.playing) {
            omakasePlayer.player.pause().subscribe(() => omakasePlayer.player.seekTo(omakasePlayer.player.mainMedia!.duration!));
          } else {
            omakasePlayer.player.seekTo(omakasePlayer.player.mainMedia!.duration!);
          }
          return true;
        }
      }
      // Fullscreen
      if (event.code === 'KeyF') {
        omakasePlayer.player.toggleFullScreen();
        return true;
      }
      if (event.code === 'Backslash') {
        const amount = event.shiftKey ? config.volumeStep : -config.volumeStep;
        const newAudioOutputLevel = Math.min(Math.max(outputHandler.volume + amount, 0), 1);
        outputHandler.setVolume(newAudioOutputLevel);
      }
    }
    return false;
  }
  public static getPlayerPlaybackRateList() {
    return playerPlaybackRateList;
  }
}
