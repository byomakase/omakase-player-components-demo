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

import {effect, inject, Injectable} from '@angular/core';
// import {AudioVisualization, OmakaseControlBarVisibility, OmakasePlayerConfig, OmakaseThemeActionIcon, OmakaseThemeFloatingControl, OmakaseTimeFormat} from '@byomakase/omakase-player';
import {BehaviorSubject, Subject} from 'rxjs';
import {Layout} from '../../model/session.model';
// import {ControlBarVisibility, DefaultThemeControl, DefaultThemeFloatingControl, PlayerChromingTheme, StampTimeFormat, WatermarkVisibility} from '@byomakase/omakase-player/';
// import {OmakaseProgressBarPosition} from '@byomakase/omakase-player';
import {SimpleLayoutConfigProviderService} from './config-providers/simple-layout-config-provider.service';
import {
  OmakasePlayerConfig,
  PlayerAudioMode,
  ChromingTheme,
  PlayerTextMode,
  ChromingTimeFormat,
  ControlBarVisibility,
  DefaultThemeControl,
  DefaultThemeFloatingControl,
  DefaultThemeActionIcon,
} from '@byomakase/omakase-player';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private simpleLayoutConfigProviderService = inject(SimpleLayoutConfigProviderService);
  private playerAudioConfigs: Record<Layout, () => Partial<OmakasePlayerConfig>> = {
    'audio': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: PlayerAudioMode.MULTIPLE,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.DEFAULT,
    }),
    'simple': () => this.simpleLayoutConfigProviderService.getThemeConfig(this.audioMode === PlayerAudioMode.MULTIPLE),
    'media-handlers': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.DEFAULT,
      chromingThemeConfig: {
        htmlTemplateId: 'omakase-chroming-marker-track-select',
      },
      detachWindowUrlFn: () => this.resolveDetachedUrl(),
      detachWindowFeatures: 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=1280,height=720,left=300,top=300',
    }),
    'marker': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.DEFAULT,
      chromingThemeConfig: {
        htmlTemplateId: 'omakase-chroming-marker-track-select',
      },
    }),
    'timeline': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.DEFAULT,
      chromingThemeConfig: {
        htmlTemplateId: 'omakase-chroming-snapshot-button',
      },
    }),
    'chromeless': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingTheme: ChromingTheme.CHROMELESS,
    }),
    'text': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.DEFAULT,
      chromingThemeConfig: {
        controlBarVisibility: ControlBarVisibility.ENABLED,
        floatingControls: [DefaultThemeFloatingControl.PLAYBACK_CONTROLS, DefaultThemeFloatingControl.TIME],
        alwaysOnFloatingControls: [DefaultThemeFloatingControl.TIME],
        actionIcons: [DefaultThemeActionIcon.HELP_MENU],
        trackSelectorAutoClose: true,
        timeFormat: ChromingTimeFormat.TIMECODE,
        controlBar: [
          DefaultThemeControl.PLAY,
          DefaultThemeControl.FRAME_FORWARD,
          DefaultThemeControl.TEN_FRAMES_FORWARD,
          DefaultThemeControl.FRAME_BACKWARD,
          DefaultThemeControl.TEN_FRAMES_BACKWARD,
          DefaultThemeControl.BITC,
          DefaultThemeControl.FULLSCREEN,
          DefaultThemeControl.VOLUME,
          DefaultThemeControl.SCRUBBER,
          DefaultThemeControl.TRACK_SELECTOR,
          DefaultThemeControl.PLAYBACK_RATE,
        ],
      },
    }),
    'stamp': () => ({
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.STAMP,
    }),
  };
  private playerConfigs: Record<Layout, () => Partial<OmakasePlayerConfig>> = {
    'audio': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: PlayerAudioMode.MULTIPLE,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.DEFAULT,
    }),
    'simple': () => this.simpleLayoutConfigProviderService.getThemeConfig(this.audioMode === PlayerAudioMode.MULTIPLE),
    'media-handlers': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.DEFAULT,
      chromingThemeConfig: {
        htmlTemplateId: 'omakase-chroming-marker-track-select',
      },
      detachWindowUrlFn: () => this.resolveDetachedUrl(),
      detachWindowFeatures: 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=1280,height=720,left=300,top=300',
    }),
    'marker': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingTheme: ChromingTheme.DEFAULT,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingThemeConfig: {
        htmlTemplateId: 'omakase-chroming-marker-track-select',
      },
    }),
    'timeline': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.DEFAULT,
      chromingThemeConfig: {
        htmlTemplateId: 'omakase-chroming-snapshot-button',
      },
    }),
    'chromeless': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingTheme: ChromingTheme.CHROMELESS,
    }),
    'text': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.DEFAULT,
      chromingThemeConfig: {
        controlBarVisibility: ControlBarVisibility.ENABLED,
        floatingControls: [DefaultThemeFloatingControl.PLAYBACK_CONTROLS],
        actionIcons: [DefaultThemeActionIcon.HELP_MENU],
        trackSelectorAutoClose: true,
        timeFormat: ChromingTimeFormat.TIMECODE,
        controlBar: [
          DefaultThemeControl.PLAY,
          DefaultThemeControl.FRAME_FORWARD,
          DefaultThemeControl.TEN_FRAMES_FORWARD,
          DefaultThemeControl.FRAME_BACKWARD,
          DefaultThemeControl.TEN_FRAMES_BACKWARD,
          DefaultThemeControl.BITC,
          DefaultThemeControl.FULLSCREEN,
          DefaultThemeControl.VOLUME,
          DefaultThemeControl.SCRUBBER,
          DefaultThemeControl.TRACK_SELECTOR,
          DefaultThemeControl.PLAYBACK_RATE,
        ],
      },
    }),
    'stamp': () => ({
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.STAMP,
    }),
  };

  public onLayoutChange$: BehaviorSubject<Layout> = new BehaviorSubject<Layout>('simple');
  public onLayoutInitialized$: Subject<boolean> = new BehaviorSubject<boolean>(false);

  private _layout: Layout = 'simple';
  private _layouts: Layout[] = ['simple', 'media-handlers', 'marker', 'timeline', 'chromeless', 'text', 'audio', 'stamp'];
  private _overridableLayouts = ['simple', 'audio', 'marker', 'timeline', 'chromeless', 'text', 'stamp'];
  private _isMultiAudioMode = false;

  private _supportedLayouts: Set<Layout> = new Set(['media-handlers', 'simple', 'marker', 'timeline', 'chromeless', 'text', 'audio', 'stamp']);

  public set layout(value: Layout) {
    this._layout = value;
    this.onLayoutInitialized$.next(false);
    this.onLayoutChange$.next(value);
  }

  /**
   * Active layout
   */
  public get layout() {
    return this._layout;
  }

  /**
   * All available layouts
   */
  public get layouts(): Layout[] {
    return this._layouts;
  }

  private resolveDetachedUrl() {
    const url = new URL(window.location.href);
    return `${url.origin}/detached?multiAudioMode=${this._isMultiAudioMode ? 'true' : 'false'}`;
  }

  public set layouts(value: Layout[]) {
    this._layouts = value.filter((layout) => this._supportedLayouts.has(layout));
  }

  public get isMultiAudioMode() {
    return this._isMultiAudioMode;
  }

  public set isMultiAudioMode(newValue: boolean) {
    this._isMultiAudioMode = newValue;
  }

  private get audioMode() {
    return this._isMultiAudioMode ? PlayerAudioMode.MULTIPLE : PlayerAudioMode.SINGLE;
  }

  /**
   * Player configuration for active layout
   */
  public getPlayerConfiguration(isMainMediaAudio = false): Partial<OmakasePlayerConfig> {
    if (isMainMediaAudio && this._overridableLayouts.includes(this._layout)) {
      return this.playerAudioConfigs[this._layout]();
    }
    return this.playerConfigs[this._layout]();
  }

  constructor() {
    // effect(() => {
    //   this.playerConfigs.simple = this.simpleLayoutConfigProviderService.themeConfig();
    // });
  }
}
