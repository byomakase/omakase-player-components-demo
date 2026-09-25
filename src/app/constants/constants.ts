// import {
//   BarChartLaneStyle,
//   ConfigWithOptionalStyle,
//   LabelLaneStyle,
//   MomentMarkerStyle,
//   PeriodMarkerStyle,
//   SubtitlesLaneStyle,
//   ThumbnailLaneStyle,
//   TimelineConfig,
//   TimelineLaneStyle,
// } from '@byomakase/omakase-player';

import {
  BarChartLaneTrackMeasurementStyle,
  LabelLaneStyle,
  LineChartLaneTrackMeasurementStyle,
  MarkerOnMarkerTrackLaneStyle,
  MarkerTrackLaneStyle,
  ObservationTrackLaneStyle,
  ScrollbarLaneStyle,
  TextTrackLaneStyle,
  ThumbnailTrackLaneStyle,
  TimelineConfig,
  TimelineLaneStyle,
  TimelineStyle,
} from '@byomakase/omakase-player';

class TextLayout {
  static VARIABLES = {
    leftLaneBackgroundColor: '#dacfe2',
    rightLaneBackgroundColor: '#fbf5ff',
    timelineBackground: '#e2dde5',
    zoomMax: 2000,
  };

  static COMPACT_TIMELINE_CONFIG: Partial<Omit<TimelineConfig, 'style'> & {style?: Partial<TimelineStyle>}> = {
    zoomWheelEnabled: true,
    playheadDragScrollMaxSpeedAfterPx: 20,
    zoomMax: this.VARIABLES.zoomMax,
    style: {
      backgroundOpacity: 1,
      backgroundFill: TextLayout.VARIABLES.timelineBackground,
      leftPaneWidth: 0,

      rightPaneMarginLeft: 20,
      rightPaneMarginRight: 20,
      rightPaneClipPadding: 20,

      // playhead
      playheadBufferedOpacity: 1,
      playheadBackgroundOpacity: 1,
      playheadTextYOffset: -14,
      playheadTextFontSize: 0,

      playheadLineWidth: 2,
      playheadSymbolHeight: 12,
      playheadScrubberHeight: 9,

      playheadPlayProgressOpacity: 1,

      playheadBufferedFill: '#c793ef',
      playheadPlayProgressFill: '#7c648e',

      // playhead hover
      scrubberSymbolHeight: 12,
      scrubberTextYOffset: -14,
      scrubberTextFontSize: 12,
      scrubberTextFill: '#662d91',
    },
  };

  static TIMELINE_LANE_STYLE: Partial<TimelineLaneStyle> = {
    marginBottom: 2,
    descriptionTextFontSize: 13,
    leftBackgroundFill: TextLayout.VARIABLES.leftLaneBackgroundColor,
    rightBackgroundFill: TextLayout.VARIABLES.rightLaneBackgroundColor,
  };

  static TEXT_TRACK_LANE_STYLE: Partial<TextTrackLaneStyle> = {
    ...TextLayout.TIMELINE_LANE_STYLE,
    height: 50,
    textLaneItemOpacity: 1,
    padding: 10,
    textLaneItemFill: '#662d91',
  };

  static THUMBNAIL_LANE_STYLE: Partial<ThumbnailTrackLaneStyle> = {
    ...TextLayout.TIMELINE_LANE_STYLE,
    height: 36,
    thumbnailHeight: 36,
  };
}

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

  static TEXT_TRACK_LANE_STYLE: Partial<TextTrackLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 40,
    textLaneItemOpacity: 1,
    padding: [7, 7],
    textLaneItemFill: '#662d91',
    loadingAnimationFill: '#c793ef',
    loadingAnimationType: 'pulse',
  };

  static SCROLL_BAR_LANE_STYLE: Partial<ScrollbarLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 30,
    backgroundFill: '#1a0a26',
    backgroundOpacity: 0.9,
    scrollbarBackgroundFill: '#3d1a5c',
    scrollbarBackgroundFillOpacity: 0.5,
    scrollbarHandleBarFill: '#662d91',
    scrollbarHandleBarOpacity: 1,

    scrollbarHeight: 20,
    scrollbarWidth: '100%',
    scrollbarJustify: 'end',
  };

  static DEFAULT_LABEL_TEXT_FONT_SIZE = 15;

  static LABEL_LANE_STYLE: Partial<LabelLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    rightBackgroundOpacity: 0.8,
    textFontSize: this.DEFAULT_LABEL_TEXT_FONT_SIZE,
    textFontStyle: '400',
    textAreaStretch: false,
    descriptionTextYOffset: -2,
    textFill: '#000000',
    height: 36,
    backgroundFill: '#ffffff',
  };

  static OBSERVATION_CHART_LANE_STYLE: Partial<ObservationTrackLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 100,
    loadingAnimationFill: '#c793ef',
    loadingAnimationType: 'pulse',
  };

  static OBSERVATION_LINE_CHART_MEASUREMENT_STYLE: Partial<LineChartLaneTrackMeasurementStyle> = {
    lineStrokeWidth: 1,
    pointRadius: 1,
  };

  static OBSERVATION_BAR_CHART_MEASUREMENT_STYLE: Partial<BarChartLaneTrackMeasurementStyle> = {
    cornerRadius: 3,
    paddingX: 0.5,
  };

  static OBSERVATION_BAR_CHART_INTERPOLATION_WIDTH = 10;

  static LABEL_LANE_SELECTED_STYLE: Partial<LabelLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    ...this.LABEL_LANE_STYLE,
    rightBackgroundFill: this.VARIABLES.leftLaneBackgroundColor,
    leftBackgroundFill: this.VARIABLES.leftLaneBackgroundColor,
  };

  static MARKER_LANE_STYLE: Partial<MarkerTrackLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 36,
  };

  static MARKER_ON_MARKER_TRACK_LANE_STYLE: Partial<MarkerOnMarkerTrackLaneStyle> = {
    markerHandleMouseOverCursor: undefined,
    markerHandleMouseLeaveCursor: undefined,
  };

  // static MOMENT_MARKER_STYLE: Partial<MomentMarkerStyle> = {
  //   symbolSize: 20,
  // };

  // static PERIOD_MARKER_STYLE: Partial<PeriodMarkerStyle> = {
  //   symbolType: 'triangle',
  // };

  // static PERIOD_MARKER_STYLE_READ_ONLY: Partial<PeriodMarkerStyle> = {
  //   symbolType: 'none',
  // };

  static THUMBNAIL_LANE_STYLE: Partial<ThumbnailTrackLaneStyle> = {
    ...this.TIMELINE_LANE_STYLE,
    height: 69,
    thumbnailHeight: 69,
  };

  static TIMELINE_CONFIG: Partial<Omit<TimelineConfig, 'style'> & {style?: Partial<TimelineStyle>}> = {
    playheadDragScrollMaxSpeedAfterPx: 20,

    style: {
      loadingAnimationTheme: 'light',
      backgroundOpacity: 1,
      backgroundFill: this.VARIABLES.timelineBackground,

      leftPaneWidth: 200,

      rightPaneMarginLeft: 20,
      rightPaneMarginRight: 20,
      rightPaneClipPadding: 20,

      // playhead
      playheadBufferedOpacity: 1,
      playheadBackgroundOpacity: 1,
      playheadTextYOffset: -14,

      playheadLineWidth: 2,
      playheadSymbolHeight: 12,
      playheadScrubberHeight: 9,
      playheadTextFontSize: 0,

      playheadBufferedFill: '#c793ef',
      playheadPlayProgressFill: '#7c648e',

      playheadPlayProgressOpacity: 1,

      // scrubber
      scrubberSymbolHeight: 12,
      scrubberTextYOffset: -14,
      scrubberTextFontSize: 12,
      scrubberTextFill: '#662d91',
    },
  };

  static TEXT_LAYOUT = TextLayout;

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
