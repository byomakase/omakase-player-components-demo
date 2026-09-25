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

import {effect, inject, Injectable, signal} from '@angular/core';
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
  OmakaseControlBarVisibility,
  OmakaseProgressBarPosition,
  OmakaseThemeActionIcon,
  OmakaseThemeControl,
  OmakaseThemeFloatingControl,
  AudioThemeControl,
  AudioVisualization,
} from '@byomakase/omakase-player';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private simpleLayoutConfigProviderService = inject(SimpleLayoutConfigProviderService);

  private readonly audioThemeControlBar = [
    AudioThemeControl.PLAY,
    AudioThemeControl.PLAYBACK_RATE,
    AudioThemeControl.ROUTER,
    AudioThemeControl.SCRUBBER,
    AudioThemeControl.TIME,
    AudioThemeControl.TRACK_SELECTOR,
    AudioThemeControl.VOLUME,
  ];

  private getAudioThemeConfig(overrides?: {playerAudioMode?: PlayerAudioMode; htmlTemplateId?: string}): Partial<OmakasePlayerConfig> {
    return {
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: overrides?.playerAudioMode ?? this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.AUDIO,
      chromingThemeConfig: {
        visualization: AudioVisualization.ENABLED,
        timeInteractive: true,
        controlBar: [...this.audioThemeControlBar],
        htmlTemplateId: overrides?.htmlTemplateId,
      },
    };
  }

  private playerAudioConfigs: Record<Layout, () => Partial<OmakasePlayerConfig>> = {
    'audio': () => this.getAudioThemeConfig({playerAudioMode: PlayerAudioMode.MULTIPLE}),
    'simple': () => this.simpleLayoutConfigProviderService.getThemeConfig(),
    'media-handlers': () => this.playerConfigs['media-handlers'](),
    'marker': () => this.getAudioThemeConfig({htmlTemplateId: 'omakase-chroming-marker-track-select'}),
    'timeline': () => this.getAudioThemeConfig(),
    'chromeless': () => this.playerConfigs['chromeless'](),
    'hybrid': () => this.getAudioThemeConfig({playerAudioMode: PlayerAudioMode.SINGLE}),
    'text': () => this.getAudioThemeConfig(),
    'stamp': () => this.playerConfigs['stamp'](),
  };
  private playerConfigs: Record<Layout, () => Partial<OmakasePlayerConfig>> = {
    'audio': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: PlayerAudioMode.MULTIPLE,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.DEFAULT,
    }),
    'simple': () => this.simpleLayoutConfigProviderService.getThemeConfig(),
    'media-handlers': () => ({
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: this.audioMode,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.DEFAULT,
      chromingThemeConfig: {
        htmlTemplateId: 'omakase-chroming-marker-track-select',
        timeInteractive: true,
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
      playerAudioMode: PlayerAudioMode.SINGLE,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingTheme: ChromingTheme.CHROMELESS,
    }),
    'hybrid': () => this.getHybridThemeConfig(),
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
          DefaultThemeControl.TIME_TOGGLE,
          DefaultThemeControl.FULLSCREEN_TOGGLE,
          DefaultThemeControl.VOLUME,
          DefaultThemeControl.SCRUBBER,
          DefaultThemeControl.TRACK_SELECTOR,
          DefaultThemeControl.PLAYBACK_RATE,
        ],
      },
    }),
    'stamp': () => ({
      playerAudioMode: PlayerAudioMode.SINGLE,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingTheme: ChromingTheme.STAMP,
    }),
  };

  public onLayoutChange$: BehaviorSubject<Layout> = new BehaviorSubject<Layout>('simple');
  public onLayoutInitialized$: Subject<boolean> = new BehaviorSubject<boolean>(false);

  /**
   * Layout switch currently in flight, or undefined when there is none.
   * Set for the whole duration of the tear down / re-create cycle so the UI can mask it.
   */
  public readonly layoutSwitch = signal<LayoutSwitch | undefined>(undefined);

  public readonly layoutLabels: Record<Layout, string> = {
    'media-handlers': 'Media Handlers Layout',
    'simple': 'Simple Layout',
    'audio': 'Audio Layout',
    'marker': 'Marker Layout',
    'timeline': 'Timeline Layout',
    'chromeless': 'Chromeless Layout',
    'hybrid': 'Hybrid Layout',
    'text': 'Text Layout',
    'stamp': 'Stamp Layout',
  };

  private _layout: Layout = 'simple';
  private _layouts: Layout[] = ['simple', 'media-handlers', 'marker', 'timeline', 'chromeless', 'hybrid', 'text', 'audio', 'stamp'];
  private _overridableLayouts = ['simple', 'audio', 'marker', 'timeline', 'chromeless', 'hybrid', 'text', 'stamp'];
  private _isMultiAudioMode = false;

  private _supportedLayouts: Set<Layout> = new Set(['media-handlers', 'simple', 'marker', 'timeline', 'chromeless', 'hybrid', 'text', 'audio', 'stamp']);

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
   * Marks the start of a layout switch. The UI masks everything until {@link endLayoutSwitch} is called.
   * Re-creating the layout that is already active (e.g. on a theme change) counts as an update, not a switch.
   */
  public beginLayoutSwitch(layout: Layout) {
    this.layoutSwitch.set({layout: layout, isUpdate: layout === this._layout});
  }

  /**
   * Marks the end of a layout switch, i.e. the point where the newly created player takes over.
   */
  public endLayoutSwitch() {
    this.layoutSwitch.set(undefined);
  }

  /**
   * All available layouts
   */
  public get layouts(): Layout[] {
    return this._layouts;
  }

  private getHybridThemeConfig(): Partial<OmakasePlayerConfig> {
    return {
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: PlayerAudioMode.SINGLE,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingTheme: ChromingTheme.OMAKASE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingThemeConfig: {
        timeFormat: ChromingTimeFormat.TIMECODE,
        controlBarVisibility: OmakaseControlBarVisibility.DISABLED,
        floatingControls: [OmakaseThemeFloatingControl.PROGRESS_BAR, OmakaseThemeFloatingControl.ACTION_ICONS, OmakaseThemeFloatingControl.PLAYBACK_CONTROLS, OmakaseThemeFloatingControl.TIME],
        actionIcons: [OmakaseThemeActionIcon.HELP_MENU, OmakaseThemeActionIcon.FULLSCREEN_TOGGLE],
        alwaysOnFloatingControls: [OmakaseThemeFloatingControl.PROGRESS_BAR, OmakaseThemeFloatingControl.TIME],
        progressBarPosition: OmakaseProgressBarPosition.UNDER_VIDEO,
      },
    };
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

export interface LayoutSwitch {
  layout: Layout;
  /**
   * True when the layout is being re-created rather than replaced, i.e. the target layout is the active one.
   */
  isUpdate: boolean;
}
