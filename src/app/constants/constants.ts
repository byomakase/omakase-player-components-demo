import {
  BarChartLaneStyle,
  ConfigWithOptionalStyle,
  LabelLaneStyle,
  MomentMarkerStyle,
  PeriodMarkerStyle,
  SubtitlesLaneStyle,
  ThumbnailLaneStyle,
  TimelineConfig,
  TimelineLaneStyle,
} from '@byomakase/omakase-player';

export class Constants {
  static COLOR_RESOLVER_IDS = {
    observationTrack: 'observation-track',
  };
  static VARIABLES = {
    leftLaneBackgroundColor: '#dacfe2',
    rightLaneBackgroundColor: '#fbf5ff',
    timelineBackground: '#e2dde5',
  };
  static TIMELINE_LANE_STYLE: Partial<TimelineLaneStyle> = {
    marginBottom: 2,
    descriptionTextFontSize: 13,
    leftBackgroundFill: this.VARIABLES.leftLaneBackgroundColor,
    rightBackgroundFill: this.VARIABLES.rightLaneBackgroundColor,
  };

  static SUBTITLES_LANE_STYLE: Partial<SubtitlesLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 40,
    subtitlesLaneItemOpacity: 1,
    paddingTop: 7,
    paddingBottom: 7,
    subtitlesLaneItemFill: '#662d91',
  };

  static LABEL_LANE_STYLE: Partial<LabelLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    rightBackgroundOpacity: 0.8,
    textFontSize: 15,
    textFontStyle: '400',
    textAreaStretch: false,
    descriptionTextYOffset: -2,
    textFill: '#000000',
    height: 36,
    backgroundFill: '#ffffff',
  };

  static OBSERVATION_CHART_LANE_STYLE: Partial<BarChartLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 100,
  };

  static LABEL_LANE_SELECTED_STYLE: Partial<LabelLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    ...this.LABEL_LANE_STYLE,
    rightBackgroundFill: this.VARIABLES.leftLaneBackgroundColor,
    // leftBackgroundFill: this.VARIABLES.leftLaneBackgroundColor,
  };

  static MARKER_LANE_STYLE: Partial<TimelineLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 36,
  };

  static MOMENT_MARKER_STYLE: Partial<MomentMarkerStyle> = {
    symbolSize: 20,
  };

  static PERIOD_MARKER_STYLE: Partial<PeriodMarkerStyle> = {
    symbolType: 'triangle',
  };

  static PERIOD_MARKER_STYLE_READ_ONLY: Partial<PeriodMarkerStyle> = {
    symbolType: 'none',
  };

  static THUMBNAIL_LANE_STYLE: Partial<ThumbnailLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 69,
    thumbnailHeight: 69,
  };

  static TIMELINE_CONFIG: Partial<ConfigWithOptionalStyle<TimelineConfig>> = {
    zoomWheelEnabled: false,

    playheadDragScrollMaxSpeedAfterPx: 20,

    scrubberClickSeek: false,

    style: {
      backgroundOpacity: 1,
      backgroundFill: this.VARIABLES.timelineBackground,

      headerHeight: 18,
      headerMarginBottom: 1,
      headerBackgroundOpacity: 1,

      footerHeight: 50,
      footerMarginTop: 1,
      footerBackgroundOpacity: 0.6,

      leftPaneWidth: 200,

      rightPaneMarginLeft: 20,
      rightPaneMarginRight: 20,
      rightPaneClipPadding: 20,

      // scrollbar
      scrollbarHeight: 15,
      scrollbarBackgroundFillOpacity: 0.3,
      scrollbarHandleBarOpacity: 0.7,
      scrollbarHandleOpacity: 1,
      scrollbarHandleBarFill: '#662d91',

      // playhead
      playheadBufferedOpacity: 1,
      playheadBackgroundOpacity: 1,
      playheadTextYOffset: -14,

      playheadLineWidth: 2,
      playheadSymbolHeight: 12,
      playheadScrubberHeight: 9,

      playheadPlayProgressOpacity: 1,

      // playhead hover
      scrubberSymbolHeight: 12,
      scrubberTextYOffset: -14,
      scrubberTextFontSize: 12,
      scrubberTextFill: '#662d91',

      scrubberMarginBottom: 1,
    },
  };

  static IMAGES = {
    timeline: {
      chevronDown: '/assets/images/timeline/chevron-down.svg',
      chevronRight: '/assets/images/timeline/chevron-right.svg',
      chatbox: '/assets/images/timeline/chatbox.svg',
      chatboxActive: '/assets/images/timeline/chatbox-active.svg',
      chatboxDisabled: '/assets/images/timeline/chatbox-disabled.svg',
      circleMinus: '/assets/images/timeline/circle-minus.svg',
      circlePlus: '/assets/images/timeline/circle-plus.svg',
    },
  };
}
