import {Injectable, signal} from '@angular/core';
import {
  ControlBarVisibility,
  DefaultThemeControl,
  DefaultThemeFloatingControl,
  OmakaseControlBarVisibility,
  OmakasePlayerConfig,
  OmakaseProgressBarPosition,
  OmakaseThemeActionIcon,
  OmakaseThemeControl,
  OmakaseThemeFloatingControl,
  PlayerAudioMode,
  ChromingTheme,
  PlayerConfig,
  PlayerTextMode,
  StampThemeActionIcon,
  StampThemeFloatingControl,
  StampThemeScale,
  WatermarkVisibility,
  ChromingTimeFormat,
  AudioVisualization,
  AudioThemeControl,
} from '@byomakase/omakase-player';
export type SimpleLayoutTheme = 'default' | 'stamp' | 'omakase' | 'audio';
// export type SimpleLayoutTheme = 'default' | 'audio';

@Injectable({
  providedIn: 'root',
})
export class SimpleLayoutConfigProviderService {
  private _theme: SimpleLayoutTheme = 'default';
  private _configs: Record<SimpleLayoutTheme, Partial<OmakasePlayerConfig>> = {
    default: {
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: PlayerAudioMode.SINGLE,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingTheme: ChromingTheme.DEFAULT,
      chromingStyleUrl: '/assets/css/omakase-player.css',

      chromingThemeConfig: {
        controlBarVisibility: ControlBarVisibility.ENABLED,
        floatingControls: [DefaultThemeFloatingControl.PLAYBACK_CONTROLS, DefaultThemeFloatingControl.VU_METER],
        alwaysOnFloatingControls: [DefaultThemeFloatingControl.VU_METER],
        isFloatingVuMeterVisible: true,
        trackSelectorAutoClose: true,
        controlBar: [
          DefaultThemeControl.PLAY,
          DefaultThemeControl.FRAME_FORWARD,
          DefaultThemeControl.TEN_FRAMES_FORWARD,
          DefaultThemeControl.FRAME_BACKWARD,
          DefaultThemeControl.TEN_FRAMES_BACKWARD,
          DefaultThemeControl.BITC,
          DefaultThemeControl.FULLSCREEN,
          DefaultThemeControl.TEXT_TOGGLE,
          DefaultThemeControl.VOLUME,
          DefaultThemeControl.SCRUBBER,
          DefaultThemeControl.TRACK_SELECTOR,
          DefaultThemeControl.DETACH,
          DefaultThemeControl.ROUTER,
          DefaultThemeControl.VU_METER_TOGGLE,
        ],
      },
    },
    stamp: {
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: PlayerAudioMode.SINGLE,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingTheme: ChromingTheme.STAMP,
      chromingThemeConfig: {
        timeFormat: ChromingTimeFormat.TIMECODE,
        stampScale: StampThemeScale.FIT,
        actionIcons: [StampThemeActionIcon.FULLSCREEN, StampThemeActionIcon.AUDIO_TOGGLE],
        floatingControls: [StampThemeFloatingControl.ACTION_ICONS, StampThemeFloatingControl.PLAYBACK_CONTROLS, StampThemeFloatingControl.PROGRESS_BAR, StampThemeFloatingControl.TIME],
        alwaysOnFloatingControls: [StampThemeFloatingControl.PROGRESS_BAR, StampThemeFloatingControl.ACTION_ICONS, StampThemeFloatingControl.TIME],
      },
      chromingWatermarkVisibility: WatermarkVisibility.AUTO_HIDE,
    },
    omakase: {
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: PlayerAudioMode.SINGLE,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingTheme: ChromingTheme.OMAKASE,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingThemeConfig: {
        timeFormat: ChromingTimeFormat.TIMECODE,
        controlBarVisibility: OmakaseControlBarVisibility.ENABLED,
        floatingControls: [
          OmakaseThemeFloatingControl.PROGRESS_BAR,
          OmakaseThemeFloatingControl.ACTION_ICONS,
          OmakaseThemeFloatingControl.PLAYBACK_CONTROLS,
          OmakaseThemeFloatingControl.TIME,
          OmakaseThemeFloatingControl.VU_METER,
        ],
        actionIcons: [OmakaseThemeActionIcon.HELP_MENU, OmakaseThemeActionIcon.CONTROL_BAR_TOGGLE],
        alwaysOnFloatingControls: [OmakaseThemeFloatingControl.PROGRESS_BAR, OmakaseThemeFloatingControl.TIME, OmakaseThemeFloatingControl.VU_METER],
        isFloatingVuMeterVisible: true,
        progressBarPosition: OmakaseProgressBarPosition.UNDER_VIDEO,
        controlBar: [
          OmakaseThemeControl.PLAY,
          OmakaseThemeControl.FRAME_BACKWARD,
          OmakaseThemeControl.TEN_FRAMES_FORWARD,
          OmakaseThemeControl.FRAME_FORWARD,
          OmakaseThemeControl.TEN_FRAMES_BACKWARD,
          OmakaseThemeControl.VOLUME,
          OmakaseThemeControl.PLAYBACK_RATE,
          OmakaseThemeControl.TRACK_SELECTOR,
          OmakaseThemeControl.FULLSCREEN,
          OmakaseThemeControl.DETACH,
          OmakaseThemeControl.CLOSE,
          OmakaseThemeControl.TIME,
          OmakaseThemeControl.ROUTER,
          OmakaseThemeControl.VU_METER,
          OmakaseThemeControl.VU_METER_TOGGLE,
        ],
      },
    },
    audio: {
      playerHtmlElementId: 'omakase-player',
      playerAudioMode: PlayerAudioMode.SINGLE,
      playerTextMode: PlayerTextMode.SINGLE,
      chromingTheme: ChromingTheme.AUDIO,
      chromingStyleUrl: '/assets/css/omakase-player.css',
      chromingThemeConfig: {
        visualization: AudioVisualization.ENABLED,
        controlBar: [
          AudioThemeControl.PLAY,
          AudioThemeControl.PLAYBACK_RATE,
          AudioThemeControl.ROUTER,
          AudioThemeControl.SCRUBBER,
          AudioThemeControl.TIME,
          AudioThemeControl.TRACK_SELECTOR,
          AudioThemeControl.VOLUME,
        ],
      },
    },
  };

  private themeConfig = signal<Partial<OmakasePlayerConfig>>(this._configs.default);

  constructor() {}

  public setTheme(newTheme: SimpleLayoutTheme) {
    this._theme = newTheme;
    this.themeConfig.set(this._configs[this._theme]);
  }

  public getTheme() {
    return this._theme;
  }

  public getThemeConfig(isMultiAudio: boolean = false) {
    const config = this.themeConfig();
    if (isMultiAudio) {
      config.playerAudioMode = PlayerAudioMode.MULTIPLE;
    }

    return config;
  }

  public get themes(): SimpleLayoutTheme[] {
    return ['default', 'omakase', 'stamp', 'audio'];
  }

  public setDefaultTheme() {
    this._theme = 'default';
  }
}
