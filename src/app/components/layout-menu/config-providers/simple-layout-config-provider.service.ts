import {Injectable, signal} from '@angular/core';
import {
  AudioVisualization,
  ControlBarVisibility,
  DefaultThemeControl,
  DefaultThemeFloatingControl,
  OmakaseControlBarVisibility,
  OmakasePlayerConfig,
  OmakaseProgressBarPosition,
  OmakaseThemeActionIcon,
  OmakaseThemeControl,
  OmakaseThemeFloatingControl,
  TimeFormat,
  PlayerChromingTheme,
  StampThemeActionIcon,
  StampThemeFloatingControl,
  StampThemeScale,
  WatermarkVisibility,
} from '@byomakase/omakase-player';

export type SimpleLayoutTheme = 'default' | 'stamp' | 'omakase' | 'audio';

@Injectable({
  providedIn: 'root',
})
export class SimpleLayoutConfigProviderService {
  private _theme: SimpleLayoutTheme = 'default';
  private _configs: Record<SimpleLayoutTheme, OmakasePlayerConfig> = {
    default: {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: PlayerChromingTheme.Default,
        styleUrl: '/assets/css/omakase-player.css',

        themeConfig: {
          controlBarVisibility: ControlBarVisibility.Enabled,
          floatingControls: [DefaultThemeFloatingControl.HelpMenu, DefaultThemeFloatingControl.PlaybackControls],
          trackSelectorAutoClose: true,
          controlBar: [
            DefaultThemeControl.Play,
            DefaultThemeControl.FrameForward,
            DefaultThemeControl.TenFramesForward,
            DefaultThemeControl.FrameBackward,
            DefaultThemeControl.TenFramesBackward,
            DefaultThemeControl.Bitc,
            DefaultThemeControl.Fullscreen,
            DefaultThemeControl.Captions,
            DefaultThemeControl.Volume,
            DefaultThemeControl.Scrubber,
            DefaultThemeControl.Trackselector,
            DefaultThemeControl.Detach,
          ],
        },
      },
    },
    stamp: {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: PlayerChromingTheme.Stamp,
        themeConfig: {
          timeFormat: TimeFormat.Timecode,
          stampScale: StampThemeScale.Fit,
          actionIcons: [StampThemeActionIcon.Fullscreen, StampThemeActionIcon.AudioToggle],
          floatingControls: [StampThemeFloatingControl.ActionIcons, StampThemeFloatingControl.PlaybackControls, StampThemeFloatingControl.ProgressBar, StampThemeFloatingControl.Time],
          alwaysOnFloatingControls: [StampThemeFloatingControl.ProgressBar, StampThemeFloatingControl.ActionIcons, StampThemeFloatingControl.Time],
        },
        watermarkVisibility: WatermarkVisibility.AutoHide,
      },
    },
    omakase: {
      playerHTMLElementId: 'omakase-player',
      audioPlayMode: 'single',
      playerChroming: {
        theme: PlayerChromingTheme.Omakase,
        styleUrl: '/assets/css/omakase-player.css',

        themeConfig: {
          timeFormat: TimeFormat.Timecode,
          controlBarVisibility: OmakaseControlBarVisibility.Enabled,
          floatingControls: [OmakaseThemeFloatingControl.ProgressBar, OmakaseThemeFloatingControl.ActionIcons, OmakaseThemeFloatingControl.PlaybackControls, OmakaseThemeFloatingControl.Time],
          actionIcons: [OmakaseThemeActionIcon.HelpMenu, OmakaseThemeActionIcon.ControlBarToggle],
          alwaysOnFloatingControls: [OmakaseThemeFloatingControl.ProgressBar, OmakaseThemeFloatingControl.Time],
          progressBarPosition: OmakaseProgressBarPosition.UnderVideo,
          controlBar: [
            OmakaseThemeControl.Play,
            OmakaseThemeControl.FrameForward,
            OmakaseThemeControl.TenFramesForward,
            OmakaseThemeControl.FrameBackward,
            OmakaseThemeControl.TenFramesBackward,
            OmakaseThemeControl.Volume,
            OmakaseThemeControl.PlaybackRate,
            OmakaseThemeControl.Trackselector,
            OmakaseThemeControl.Fullscreen,
            OmakaseThemeControl.Detach,
            OmakaseThemeControl.Close,
            OmakaseThemeControl.Time,
          ],
        },
      },
    },
    audio: {
      playerHTMLElementId: 'omakase-player',
      playerChroming: {
        theme: PlayerChromingTheme.Audio,
        styleUrl: '/assets/css/omakase-player.css',
      },
    },
  };

  public themeConfig = signal<OmakasePlayerConfig>(this._configs[this._theme]);

  constructor() {}

  public setTheme(newTheme: SimpleLayoutTheme) {
    this._theme = newTheme;
    this.themeConfig.set(this._configs[this._theme]);
  }

  public getTheme() {
    return this._theme;
  }

  public get themes(): SimpleLayoutTheme[] {
    return ['default', 'omakase', 'stamp', 'audio'];
  }

  public setDefaultTheme() {
    this._theme = 'default';
  }
}
