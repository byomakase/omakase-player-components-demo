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
import {AudioVisualization, OmakaseControlBarVisibility, OmakasePlayerConfig, OmakaseThemeActionIcon, OmakaseThemeFloatingControl, OmakaseTimeFormat} from '@byomakase/omakase-player';
import {BehaviorSubject, Subject} from 'rxjs';
import {Layout} from '../../model/session.model';
import {ControlBarVisibility, DefaultThemeControl, DefaultThemeFloatingControl, PlayerChromingTheme, StampTimeFormat, WatermarkVisibility} from '@byomakase/omakase-player/';
import {OmakaseProgressBarPosition} from '@byomakase/omakase-player';
import {SimpleLayoutConfigProviderService} from './config-providers/simple-layout-config-provider.service';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private simpleLayoutConfigProviderService = inject(SimpleLayoutConfigProviderService);
  private playerAudioConfigs: Record<Layout, OmakasePlayerConfig> = {
    'simple': {
      playerHTMLElementId: 'omakase-player',
      playerChroming: {
        theme: PlayerChromingTheme.Audio,
        styleUrl: '/assets/css/omakase-player.css',
        themeConfig: {
          visualization: AudioVisualization.Enabled,
        },
      },
    },
    'audio': {
      playerHTMLElementId: 'omakase-player',
      playerChroming: {
        theme: PlayerChromingTheme.Audio,
        styleUrl: '/assets/css/omakase-player.css',
        themeConfig: {
          visualization: AudioVisualization.Enabled,
        },
      },
    },
    'marker': {
      playerHTMLElementId: 'omakase-player',
      playerChroming: {
        theme: PlayerChromingTheme.Audio,
        styleUrl: '/assets/css/omakase-player.css',

        themeConfig: {
          htmlTemplateId: 'omakase-chroming-marker-track-select',
          visualization: AudioVisualization.Enabled,
        },
      },
    },

    'timeline': {
      playerHTMLElementId: 'omakase-player',
      playerChroming: {
        theme: PlayerChromingTheme.Audio,
        styleUrl: '/assets/css/omakase-player.css',
        themeConfig: {
          visualization: AudioVisualization.Enabled,
        },
      },
    },
    'stamp': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: PlayerChromingTheme.Stamp,
        themeConfig: {
          timeFormat: StampTimeFormat.Timecode,
        },
        watermarkVisibility: WatermarkVisibility.AutoHide,
      },
    },
    'chromeless': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: PlayerChromingTheme.Chromeless,
      },
    },
    'hybrid': {
      playerHTMLElementId: 'omakase-player',
      playerChroming: {
        theme: PlayerChromingTheme.Audio,
        styleUrl: '/assets/css/omakase-player.css',
        themeConfig: {
          visualization: AudioVisualization.Enabled,
        },
      },
    },
  };
  private playerConfigs: Record<Layout, OmakasePlayerConfig> = {
    'simple': this.simpleLayoutConfigProviderService.themeConfig(),
    'audio': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'multiple',
      playerChroming: {
        theme: PlayerChromingTheme.Default,
        styleUrl: '/assets/css/omakase-player.css',
        themeConfig: {
          controlBarVisibility: ControlBarVisibility.Enabled,
          controlBar: [
            DefaultThemeControl.Bitc,
            DefaultThemeControl.Captions,
            DefaultThemeControl.Detach,
            DefaultThemeControl.FrameBackward,
            DefaultThemeControl.FrameForward,
            DefaultThemeControl.Fullscreen,
            DefaultThemeControl.Play,
            DefaultThemeControl.PlaybackRate,
            DefaultThemeControl.Scrubber,
            DefaultThemeControl.TenFramesBackward,
            DefaultThemeControl.TenFramesForward,
            DefaultThemeControl.Volume,
          ],
          floatingControls: [DefaultThemeFloatingControl.Trackselector, DefaultThemeFloatingControl.HelpMenu, DefaultThemeFloatingControl.PlaybackControls],
          trackSelectorAutoClose: false,
        },
      },
    },
    'marker': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: PlayerChromingTheme.Default,
        styleUrl: '/assets/css/omakase-player.css',
        themeConfig: {
          controlBarVisibility: ControlBarVisibility.Enabled,
          htmlTemplateId: 'omakase-chroming-marker-track-select',
        },
      },
    },
    'timeline': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: PlayerChromingTheme.Default,
        styleUrl: '/assets/css/omakase-player.css',

        themeConfig: {
          controlBarVisibility: ControlBarVisibility.Enabled,
        },
      },
    },
    'stamp': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: PlayerChromingTheme.Stamp,
        themeConfig: {
          timeFormat: StampTimeFormat.Timecode,
        },
        watermarkVisibility: WatermarkVisibility.AutoHide,
      },
    },
    'chromeless': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: PlayerChromingTheme.Chromeless,
      },
    },
    'hybrid': {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: PlayerChromingTheme.Omakase,
        styleUrl: '/assets/css/omakase-player.css',

        themeConfig: {
          timeFormat: OmakaseTimeFormat.Timecode,
          controlBarVisibility: OmakaseControlBarVisibility.Disabled,
          floatingControls: [OmakaseThemeFloatingControl.ProgressBar, OmakaseThemeFloatingControl.ActionIcons, OmakaseThemeFloatingControl.PlaybackControls, OmakaseThemeFloatingControl.Time],
          actionIcons: [OmakaseThemeActionIcon.HelpMenu, OmakaseThemeActionIcon.Fullscreen],
          alwaysOnFloatingControls: [OmakaseThemeFloatingControl.ProgressBar, OmakaseThemeFloatingControl.Time],
          progressBarPosition: OmakaseProgressBarPosition.UnderVideo,
        },
      },
    },
  };

  public onLayoutChange$: BehaviorSubject<Layout> = new BehaviorSubject<Layout>('simple');
  public onLayoutInitialized$: Subject<boolean> = new BehaviorSubject<boolean>(false);

  private _layout: Layout = 'simple';
  private _layouts: Layout[] = ['simple', 'audio', 'marker', 'timeline', 'stamp', 'chromeless', 'hybrid'];
  private _overridableLayouts = ['simple', 'audio', 'marker', 'timeline'];

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

  public set layouts(value: Layout[]) {
    this._layouts = value;
  }

  /**
   * Player configuration for active layout
   */
  public getPlayerConfiguration(isMainMediaAudio = false): OmakasePlayerConfig {
    if (isMainMediaAudio && this._overridableLayouts.includes(this._layout)) {
      return structuredClone(this.playerAudioConfigs[this._layout]);
    }
    return structuredClone(this.playerConfigs[this._layout]);
  }

  constructor() {
    effect(() => {
      this.playerConfigs.simple = this.simpleLayoutConfigProviderService.themeConfig();
    });
  }
}
