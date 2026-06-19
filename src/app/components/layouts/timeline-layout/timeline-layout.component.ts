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

import {AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, HostListener, inject, OnDestroy, signal, ViewChild} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {SidecarMarkerTrack, MarkerTrackService} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {LoadedSidecarText, SidecarTextService} from '../../fly-outs/add-sidecar-text-fly-out/text-sidecar.service';

import {PlayerService} from '../../player/player.service';
import {EMPTY, filter, map, of, Subject, switchMap, takeUntil} from 'rxjs';
import {Constants} from '../../../constants/constants';
import {StringUtil} from '../../../common/util/string-util';
import {TextTrackGroupingLane} from '../../../common/timeline/grouping-lane/text-grouping-lane/text-track-grouping-lane';
import {MarkerListComponent} from '../../../common/marker-list/marker-list.component';
import {ToastService} from '../../../common/toast/toast.service';
import {CueUtil} from '../../../common/util/cue-util';
import {ColorService} from '../../../common/services/color.service';
import {MarkerShortcutUtil} from '../../../common/util/marker-shortcut-util';
import {SidecarObservationTrack, ObservationTrackService} from '../../fly-outs/add-observation-track-fly-out/observation-track.service';
import {ColorUtil} from '../../../common/util/color-util';
import {
  BarChartLane,
  BarChartLaneTrackConfig,
  DefaultThumbnail,
  FileFormatType,
  HelpMenuGroupInsertPosition,
  ImageButton,
  LineChartLane,
  LineChartLaneTrackConfig,
  MarkerListEvent,
  MarkerListEventType,
  MarkerOnMarkerListStyle,
  MarkerOnMarkerTrackLaneStyle,
  MarkerTrack,
  MarkerTrackLane,
  MarkerTrackLaneEvent,
  MarkerTrackLaneEventType,
  MediaTemporalFormat,
  ObservationTrack,
  PlayerEventType,
  PlayerTextTrackState,
  ScrollbarLane,
  SourceUtil,
  TextTrack,
  TextTrackLane,
  TextTrackType,
  ThumbnailTrack,
  ThumbnailTrackEventType,
  ThumbnailTrackLane,
  ThumbnailTrackLaneEventType,
  TimedItemTemporalType,
  TimelineApi,
  TimelineLaneApi,
  TimelineNodeEventType,
  UiEventType,
} from '@byomakase/omakase-player';
import {ThumbnailViewer} from '../../../common/thumbnail-viewer/thumbnail-viewer.component';
import {WindowService} from '../../../common/browser/window.service';
import {ProbingUtil} from '../../../common/util/probing-util';
import {ObservationTrackGroupingLane} from '../../../common/timeline/grouping-lane/observation-grouping-lane/observation-track-grouping-lane';

@Component({
  selector: 'app-timeline-layout',
  imports: [PlayerComponent, MarkerListComponent, IconDirective, ThumbnailViewer],
  host: {'class': 'timeline-layout'},
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="north-pole">
      <div #leftSide class="left-side">
        <div #playerWrapper class="player-wrapper">
          <app-player></app-player>
        </div>
      </div>
      <div #rightSide class="right-side">
        @if (markerTrackService.activeMarkerTrack() && !isSnapshotListShown()) {
          <app-marker-list
            #markerList
            [source]="markerTrackService.activeMarkerTrack()"
            [readOnly]="markerTrackService.activeMarkerTrack()!.readOnly"
            [limitHeight]="true"
            (markerListEvent)="onMarkerListEvent($event)"
          />
        } @else {
          @if (this.isSnapshotListShown()) {
            <app-thumbnail-viewer [thumbnailTrack]="snapshotTrack!" />
          } @else {
            <div class="info-message">No marker tracks have been loaded. Click <i appIcon="pin"> </i>to load a marker track.</div>
          }
        }
      </div>
    </div>
    <div class="south-pole">
      <div id="omakase-timeline"></div>
    </div>

    <template id="omakase-chroming-snapshot-button">
      <media-chrome-button class="chroming-snapshot-button media-chrome-button" slot="end-container"><span></span></media-chrome-button>
    </template>
  `,
})
export class TimelineLayoutComponent implements AfterViewInit, OnDestroy {
  public markerTrackService = inject(MarkerTrackService);
  public sidecarTextService = inject(SidecarTextService);
  public playerService = inject(PlayerService);
  public observationTrackService = inject(ObservationTrackService);
  private windowService = inject(WindowService);
  private toastService = inject(ToastService);

  private _timeline = signal<TimelineApi | undefined>(undefined);
  private _destroyed$ = new Subject<void>();

  private _renderedMarkerTracks: SidecarMarkerTrack[] = [];
  private _renderedMarkerLanes: MarkerTrackLane[] = [];

  private _snapshotLane: ThumbnailTrackLane | undefined;
  public snapshotTrack: ThumbnailTrack | undefined;

  private _isThumbnailTrackRendered: boolean = false;

  private _renderedEmbeddedTextTracks: PlayerTextTrackState[] = [];
  private _renderedSidecarTextTracks: LoadedSidecarText[] = [];

  private _groupingLanesByTextTrackId: Map<string, TextTrackGroupingLane> = new Map();
  private _textTrackLanesByTextTrackId: Map<string, TextTrackLane> = new Map();

  private _enteredMarkerIds: Set<string> = new Set();
  private _enteredMarkerHandlersIds: Set<string> = new Set();

  private _renderedObservationTracks: SidecarObservationTrack[] = [];
  private _renderedObservationLanes: TimelineLaneApi[] = [];
  private _observationGroupingLane: ObservationTrackGroupingLane | undefined = undefined;

  private _isInitialRenderDone = signal<boolean>(false);

  @ViewChild('leftSide') leftSideRef!: ElementRef;
  @ViewChild('rightSide') rightSideRef!: ElementRef;

  private resizeObserver!: ResizeObserver;

  public isSnapshotListShown = signal(false);

  constructor() {
    // sync newly created or deleted marker tracks with timeline
    effect(() => {
      const loadedMarkerTracks = this.markerTrackService.loadedMarkerTracks();
      if (!this._timeline() || !this._isInitialRenderDone()) {
        return;
      }
      this._renderedMarkerTracks.forEach((markerTrack, index) => {
        if (!loadedMarkerTracks.includes(markerTrack)) {
          this.removeMarkerLaneAtIndex(index);
        }
      });
      loadedMarkerTracks.forEach((serviceMarkerTrack) => {
        if (!this._renderedMarkerTracks.includes(serviceMarkerTrack)) {
          this.createMarkerLaneAtIndex(serviceMarkerTrack, this._renderedMarkerTracks.length);
        }
      });
    });

    // sync newly created or deleted sidecar text tracks with timeline
    effect(() => {
      const sidecarTexts = this.sidecarTextService.loadedSidecarTexts();
      if (!this._timeline() || !this._isInitialRenderDone()) {
        return;
      }
      this._renderedSidecarTextTracks.forEach((sidecarText, index) => {
        if (!sidecarTexts.includes(sidecarText)) {
          this.removeTextLaneAtIndex(index);
        }
      });
      sidecarTexts.forEach((sidecarText) => {
        if (!this._renderedSidecarTextTracks.includes(sidecarText)) {
          this.createTextLaneAtIndex(sidecarText, this._renderedSidecarTextTracks.length, false);
        }
      });
    });

    effect(() => {
      if (!this._timeline() || !this._isInitialRenderDone()) {
        return;
      }
      if (this.playerService.thumbnailTrack()) {
        this.createThumbnailLane();
      }
    });

    effect(() => {
      const loadedObservationTracks = this.observationTrackService.loadedObservationTracks();
      if (!this._timeline() || !this._isInitialRenderDone()) {
        return;
      }
      this._renderedObservationTracks.forEach((observationTrack, index) => {
        if (!loadedObservationTracks.includes(observationTrack)) {
          this.removeObservationLaneAtIndex(index);
        }
      });
      loadedObservationTracks.forEach((observationTrack) => {
        if (!this._renderedObservationTracks.includes(observationTrack)) {
          this.createObservationLaneAtIndex(observationTrack, this._renderedObservationTracks.length);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this._destroyed$.next();
    this._destroyed$.complete();
  }

  ngAfterViewInit(): void {
    // make marker list the same size as player wrapper
    this.resizeObserver = new ResizeObserver(() => {
      const height = this.leftSideRef.nativeElement.offsetHeight;
      this.rightSideRef.nativeElement.style.height = `${height}px`;
    });

    this.resizeObserver.observe(this.leftSideRef.nativeElement);
    this.resizeObserver.observe(document.documentElement);

    this.playerService.onCreated$
      .pipe(
        takeUntil(this._destroyed$),
        switchMap((omakasePlayer) => {
          if (!omakasePlayer) return EMPTY;
          return omakasePlayer.player.onEvent$.pipe(filter((e) => e.type === PlayerEventType.PLAYER_MAIN_MEDIA_UNLOADING));
        })
      )
      .subscribe(() => this.tearDownTimeline());

    this.playerService
      .observeMediaLoads(this._destroyed$)
      .pipe(
        switchMap((omakasePlayer) => {
          if (!omakasePlayer) return EMPTY;
          return omakasePlayer.ui.onEvent$.pipe(filter((event) => event.type === UiEventType.UI_ELEMENT_UPDATED));
        })
      )
      .subscribe((event) => {
        const omakasePlayer = this.playerService.omakasePlayer!;
        const focused = !!event.data.element.props?.focused;
        omakasePlayer.ui.updateStyleRule<MarkerOnMarkerTrackLaneStyle>({id: event.data.element.id, style: {markerRenderType: focused ? 'spanning-over-all-lanes' : 'default'}});
        omakasePlayer.ui.updateStyleRule<MarkerOnMarkerListStyle>({id: event.data.element.id, style: {highlightMarker: focused}});
      });

    this.playerService
      .observeMediaLoads(this._destroyed$)
      .pipe(
        switchMap((omakasePlayer) => {
          if (!omakasePlayer) {
            this.tearDownTimeline();
            return EMPTY;
          }

          this.wireSnapshotButton();
          this.registerMarkerShortcutsHelpMenuGroup();
          this.registerAdditionalShortcutsHelpMenuGroup();

          return omakasePlayer.createTimeline(Constants.TIMELINE_CONFIG);
        })
      )
      .subscribe((timelineApi) => {
        this._timeline.set(timelineApi);
        this.processScrubberLane();
        this.createScrollbarLane();
        this.createMarkerLanes();
        this.createThumbnailLane();
        this.createEmbeddedTextLanes();
        this.createSidecarTextLanes();
        this.createObservationLanes();
        this._isInitialRenderDone.set(true);
      });
  }

  private tearDownTimeline() {
    this._isInitialRenderDone.set(false);
    this._timeline.set(undefined);
    this._timeline()?.destroy();
    this._renderedMarkerLanes = [];
    this._renderedMarkerTracks = [];
    this._renderedEmbeddedTextTracks = [];
    this._renderedSidecarTextTracks = [];
    this._groupingLanesByTextTrackId.clear();
    this._textTrackLanesByTextTrackId.clear();
    this._enteredMarkerHandlersIds.clear();
    this._enteredMarkerIds.clear();
    this._snapshotLane = undefined;
    this.snapshotTrack = undefined;
    this._isThumbnailTrackRendered = false;
    this._renderedObservationTracks = [];
    this._renderedObservationLanes = [];
    this._observationGroupingLane = undefined;
  }

  /**
   * Render marker lanes for each marker track. Only used during the initialization.
   */
  private createMarkerLanes() {
    const markerTracks = this.markerTrackService.loadedMarkerTracks();
    markerTracks.forEach((markerTrack, index) => {
      this.createMarkerLaneAtIndex(markerTrack, index);
    });
  }

  /**
   * Render text grouping lanes for each embedded text track. Only used during the initialization.
   */
  private createEmbeddedTextLanes() {
    const subtitlesTracks = this.playerService.omakasePlayer!.player.text.state.tracks['MAIN'];

    subtitlesTracks.forEach((subtitlesTrack, index) => {
      this.createTextLaneAtIndex(subtitlesTrack, index, true);
    });
  }

  private createSidecarTextLanes() {
    const sidecarTexts = this.sidecarTextService.loadedSidecarTexts();
    sidecarTexts.forEach((sidecarText, index) => {
      this.createTextLaneAtIndex(sidecarText, index, false);
    });
  }

  private createObservationLanes() {
    const observationTracks = this.observationTrackService.loadedObservationTracks();
    observationTracks.forEach((observationTrack, index) => {
      this.createObservationLaneAtIndex(observationTrack, index);
    });
  }

  /**
   * Removes a marker lane corresponding to marker track at specified index.
   *
   * @param index - index of marker track whose lane is to be removed
   * @returns
   */
  private removeMarkerLaneAtIndex(index: number) {
    if (!this._timeline()) {
      console.error('No timeline is present');
      return;
    }

    const markerLane = this._renderedMarkerLanes.at(index);

    if (!markerLane) {
      console.error("Marker lane doesn't exist");
      return;
    }

    this._renderedMarkerTracks.splice(index, 1);
    this._renderedMarkerLanes.splice(index, 1);

    this._timeline()!.removeTimelineLane(markerLane.id);
  }

  /**
   * Creates a marker lane at timeline index determined through marker track index
   *
   * @param markerTrack - marker track to be visualized
   * @param index - index of marker track with respect to all visualized marker tracks
   * @returns
   */
  private createMarkerLaneAtIndex(markerTrack: SidecarMarkerTrack, index: number) {
    if (!this._timeline() || !markerTrack.id) {
      console.error('No timeline is present', this._timeline(), markerTrack.id);
      return;
    }

    const markerLane = new MarkerTrackLane({
      description: markerTrack.label ?? '',
      style: Constants.MARKER_LANE_STYLE,

      //   markerCreateFn: (cue, index) => {
      //     const name = CueUtil.extractName(cue.text);
      //     const color = markerTrack.color !== 'multicolor' ? markerTrack.color : colorResolver.getColorByIndex(index);

      //     if (cue.endTime - cue.startTime < 1) {
      //       return new MomentMarker({
      //         timeObservation: {
      //           time: cue.startTime,
      //         },
      //         style: {
      //           ...Constants.MOMENT_MARKER_STYLE,
      //           color: color,
      //         },
      //         editable: !markerTrack.readOnly,
      //         text: name === '' ? `Marker ${index + 1}` : name,
      //       });
      //     } else {
      //       const periodMarkerStyle = markerTrack.readOnly ? Constants.PERIOD_MARKER_STYLE_READ_ONLY : Constants.PERIOD_MARKER_STYLE;
      //       return new PeriodMarker({
      //         timeObservation: {
      //           start: cue.startTime,
      //           end: cue.endTime,
      //         },
      //         style: {
      //           ...periodMarkerStyle,
      //           color: color,
      //         },
      //         editable: !markerTrack.readOnly,
      //         text: name === '' ? `Marker ${index + 1}` : name,
      //       });
      //     }
      //   },
      //   markerProcessFn: (marker) => {
      //     marker.onClick$.subscribe(() => {
      //       markerLane.toggleMarker(marker.id);

      //       if (this.markerTrackService.activeMarkerTrack() !== markerTrack) {
      //         this.markerTrackService.activeMarkerTrack.set(markerTrack);
      //       }

      //       this._renderedMarkerLanes
      //         .filter((rl) => rl !== markerLane)
      //         .forEach((lane) => {
      //           const selectedMarker = lane.getSelectedMarker();
      //           if (selectedMarker) {
      //             lane.toggleMarker(selectedMarker.id);
      //           }
      //         });
      //     });

      //     marker.onMouseEnter$.subscribe(() => {
      //       document.body.style.cursor = 'pointer';
      //     });

      //     marker.onMouseOut$.subscribe(() => {
      //       document.body.style.cursor = 'unset';
      //     });
      //   },
    });

    //dc

    markerLane.addTrack(this.playerService.omakasePlayer!.track.get(markerTrack.id)! as MarkerTrack, {
      style: Constants.MARKER_ON_MARKER_TRACK_LANE_STYLE,
    });

    markerLane.onEvent$.pipe(takeUntil(this._destroyed$)).subscribe((markerTrackLaneEvent: MarkerTrackLaneEvent) => {
      console.log(markerTrackLaneEvent, this._enteredMarkerIds);

      if (
        markerTrackLaneEvent.type === MarkerTrackLaneEventType.TIMELINE_MARKER_TRACK_LANE_ITEM_CLICK ||
        markerTrackLaneEvent.type === MarkerTrackLaneEventType.TIMELINE_MARKER_TRACK_LANE_ITEM_HANDLE_CLICK
      ) {
        this.isSnapshotListShown.set(false);
        this.markerTrackService.activeMarkerTrack.set(markerTrack);
        this.setMarkerFocus(markerTrackLaneEvent.data.item.id);
      } else if (markerTrackLaneEvent.type === MarkerTrackLaneEventType.TIMELINE_MARKER_TRACK_LANE_ITEM_MOUSE_ENTER) {
        this._enteredMarkerIds.add(markerTrackLaneEvent.data.item.id);

        document.body.style.cursor = 'pointer';
      } else if (markerTrackLaneEvent.type === MarkerTrackLaneEventType.TIMELINE_MARKER_TRACK_LANE_ITEM_MOUSE_LEAVE) {
        this._enteredMarkerIds.delete(markerTrackLaneEvent.data.item.id);

        if (this._enteredMarkerHandlersIds.size) {
          document.body.style.cursor = 'grab';
        } else if (this._enteredMarkerIds.size) {
          document.body.style.cursor = 'pointer';
        } else {
          document.body.style.cursor = 'unset';
        }
      } else if (markerTrackLaneEvent.type === MarkerTrackLaneEventType.TIMELINE_MARKER_TRACK_LANE_ITEM_HANDLE_MOUSE_LEAVE) {
        this._enteredMarkerHandlersIds.delete(markerTrackLaneEvent.data.item.id);

        if (this._enteredMarkerHandlersIds.size) {
          document.body.style.cursor = 'grab';
        } else if (this._enteredMarkerIds.size) {
          document.body.style.cursor = 'pointer';
        } else {
          document.body.style.cursor = 'unset';
        }
      } else if (markerTrackLaneEvent.type === MarkerTrackLaneEventType.TIMELINE_MARKER_TRACK_LANE_ITEM_HANDLE_MOUSE_ENTER) {
        this._enteredMarkerHandlersIds.add(markerTrackLaneEvent.data.item.id);

        document.body.style.cursor = 'grab';
      }

      console.log(document.body.style.cursor);
    });

    this._timeline()!.addTimelineLaneAtIndex(markerLane, this.resolveMarkerLaneIndex(index));
    this._renderedMarkerTracks.splice(index, 0, markerTrack);
    this._renderedMarkerLanes.splice(index, 0, markerLane);
  }

  onMarkerListEvent(event: MarkerListEvent) {
    if (event.type === MarkerListEventType.MARKER_LIST_ITEM_CLICK) {
      this.setMarkerFocus(event.data.item.id);
    }
  }

  private setMarkerFocus(markerId: string) {
    const ui = this.playerService.omakasePlayer!.ui;
    const activeElement = ui.elements.find((element) => element.props?.focused);

    if (activeElement) {
      ui.updateElement({id: activeElement.id, props: {focused: void 0}});
    }
    if (markerId !== activeElement?.id) {
      ui.updateElement({id: markerId, props: {focused: true}});
    }
  }

  private resolveSnapshotLaneIndex() {
    return 1;
  }

  /**
   * Maps marker lane index to timeline lane index
   * @param index - Index with respect to marker lanes
   * @returns Index with respect to all timeline lanes
   */
  private resolveMarkerLaneIndex(index: number) {
    const snapshotLaneOffset = this._snapshotLane ? 1 : 0;
    return snapshotLaneOffset + index + 1; // scrubber lane is at 0
  }

  /**
   * Returns the timeline index of the thumbnail lane. There can only be one thumbnail lane.
   * @returns Index with respect to all timeline lanes
   */
  private resolveThumbnailLaneIndex() {
    const snapshotLaneOffset = this._snapshotLane ? 1 : 0;
    return snapshotLaneOffset + this._renderedMarkerTracks.length + 1; // scrubber at 0
  }

  /**
   *
   * @param index - Index with respect to either embedded or sidecar text tracks
   * @param embedded - Flag that specifies text track family
   * @returns Index with respect to all timeline lanes
   */
  private resolveTextLaneIndex(index: number, embedded = false) {
    const numberOfMarkerLanes = this._renderedMarkerTracks.length;
    const numberOfThumbnailLanes = this._isThumbnailTrackRendered ? 1 : 0;
    const numberOfEmbeddedTextLanes = embedded ? 0 : this._renderedEmbeddedTextTracks.length;
    const snapshotLaneOffset = this._snapshotLane ? 1 : 0;

    // scrubber at 0, each text track has 2 lanes (grouping + text track lane)
    return snapshotLaneOffset + numberOfMarkerLanes + numberOfThumbnailLanes + 2 * (index + numberOfEmbeddedTextLanes) + 1;
  }

  private createScrollbarLane() {
    const timeline = this._timeline();
    if (!timeline) {
      console.error('No timeline is present');
      return;
    }

    let scrollbarLane = new ScrollbarLane({
      style: Constants.SCROLL_BAR_LANE_STYLE,
    });
    timeline.addTimelineLane(scrollbarLane);
  }
  private resolveTextTrackDisplayName(textTrack: PlayerTextTrackState | LoadedSidecarText, resolvedTrack: TextTrack, embedded: boolean, index: number): string {
    const firstNonEmpty = (...candidates: (string | undefined | null)[]): string | undefined => candidates.find((c) => StringUtil.isNonEmpty(c)) ?? undefined;

    if (embedded) {
      return firstNonEmpty(resolvedTrack.label, resolvedTrack.state.srclang) ?? `Text Track ${index + 1}`;
    }
    const sidecar = textTrack as LoadedSidecarText;
    const filename = StringUtil.isNonEmpty(sidecar.src) ? StringUtil.leafUrlToken(sidecar.src) : undefined;
    const label = firstNonEmpty(sidecar.label, resolvedTrack.label, resolvedTrack.state.srclang);

    if (filename && label) return `${filename} (${label})`;
    return filename ?? label ?? `Sidecar Text ${index + 1}`;
  }

  private resolveObservationLaneIndex(index: number) {
    const snapshotLaneOffset = this._snapshotLane ? 1 : 0;
    const numberOfMarkerLanes = this._renderedMarkerTracks.length;
    const numberOfThumbnailLanes = this._isThumbnailTrackRendered ? 1 : 0;
    const numberOfEmbeddedTextLanes = this._renderedEmbeddedTextTracks.length;
    const numberOfSidecarTextLanes = this._renderedSidecarTextTracks.length;

    // scrubber at 0, text tracks each take 2 lanes (grouping + content), then observation grouping lane, then this index
    return snapshotLaneOffset + numberOfMarkerLanes + numberOfThumbnailLanes + 2 * (numberOfEmbeddedTextLanes + numberOfSidecarTextLanes) + 1 + 1 + index;
  }

  /**
   * Creates a thumbnail lane if thumbnail track is specified.
   * @returns
   */
  private createThumbnailLane() {
    const timeline = this._timeline();
    if (!timeline) {
      console.error('No timeline is present');
      return;
    }

    if (this._isThumbnailTrackRendered) {
      return;
    }

    const thumbnailTrack = this.playerService.thumbnailTrack();

    if (!thumbnailTrack) {
      return;
    }

    const thumbnailLane = new ThumbnailTrackLane({
      style: Constants.THUMBNAIL_LANE_STYLE,
    });

    thumbnailLane.setTrack(thumbnailTrack);

    timeline.addTimelineLaneAtIndex(thumbnailLane, this.resolveThumbnailLaneIndex());
    this._isThumbnailTrackRendered = true;
  }

  private createTextLaneAtIndex(textTrack: PlayerTextTrackState | LoadedSidecarText, index: number, embedded = false) {
    const timeline = this._timeline();
    const omakasePlayer = this.playerService.omakasePlayer;
    if (!timeline || !omakasePlayer) {
      console.error('No timeline or player is present');
      return;
    }

    const trackId = 'trackId' in textTrack ? textTrack.trackId : textTrack.id;
    if (!trackId) return;

    const resolvedTrack = omakasePlayer.track.get(trackId) as TextTrack;
    if (!resolvedTrack) return;

    const labelLaneIndex = this.resolveTextLaneIndex(index, embedded);
    const displayName = this.resolveTextTrackDisplayName(textTrack, resolvedTrack, embedded, index);

    const groupingLane = new TextTrackGroupingLane(
      {
        textTrack: resolvedTrack,
        text: displayName,
        style: Constants.LABEL_LANE_STYLE,
      },
      omakasePlayer.player.text
    );

    const textTrackLane = new TextTrackLane({
      style: Constants.TEXT_TRACK_LANE_STYLE,
      description: ' ',
      loadingAnimation: true,
    });

    const formatType$ = resolvedTrack.sourceFileFormatType
      ? of(resolvedTrack.sourceFileFormatType)
      : ProbingUtil.resolveFileFormat(omakasePlayer, SourceUtil.resolveUrlFromSource(resolvedTrack.source!)).pipe(map((fileFormat) => fileFormat?.type));

    formatType$
      .pipe(
        switchMap((formatType) => {
          if (formatType && formatType !== FileFormatType.VTT) {
            this.toastService.show({message: `Timeline cannot visualize non-VTT text tracks`, type: 'warning', duration: 5000});
            return EMPTY;
          }
          return resolvedTrack.areTimedItemsFetched ? of(undefined) : omakasePlayer.track.utils.fetchTimedItems(resolvedTrack.id).pipe(map(() => undefined));
        })
      )
      .subscribe(() => {
        textTrackLane.setTrack(resolvedTrack);
      });

    timeline.addTimelineLaneAtIndex(groupingLane, labelLaneIndex);
    timeline.addTimelineLaneAtIndex(textTrackLane, labelLaneIndex + 1);

    groupingLane.addChildLane(textTrackLane);

    this._groupingLanesByTextTrackId.set(trackId, groupingLane);
    this._textTrackLanesByTextTrackId.set(trackId, textTrackLane);

    if (embedded) {
      this._renderedEmbeddedTextTracks.push(textTrack as PlayerTextTrackState);
    } else {
      this._renderedSidecarTextTracks.push(textTrack as LoadedSidecarText);
    }
  }

  private removeObservationLaneAtIndex(index: number) {
    const timeline = this._timeline();
    if (!timeline) {
      console.error('No timeline is present');
      return;
    }

    const lane = this._renderedObservationLanes.at(index);
    if (!lane) {
      console.error("Observation lane doesn't exist");
      return;
    }

    timeline.removeTimelineLane(lane.id);

    this._renderedObservationLanes.splice(index, 1);
    this._renderedObservationTracks.splice(index, 1);

    if (this._renderedObservationTracks.length === 0 && this._observationGroupingLane) {
      timeline.removeTimelineLane(this._observationGroupingLane.id);
      this._observationGroupingLane = undefined;
    }
  }

  private removeTextLaneAtIndex(index: number, embedded = false) {
    const timeline = this._timeline();
    if (!timeline) {
      console.error('No timeline is present');
      return;
    }

    const textTrack = embedded ? this._renderedEmbeddedTextTracks.at(index) : this._renderedSidecarTextTracks.at(index);

    if (!textTrack) {
      console.error('Text track does not exist');
      return;
    }

    const trackId = 'trackId' in textTrack ? textTrack.trackId : textTrack.id;
    const groupingLane = this._groupingLanesByTextTrackId.get(trackId);
    const textTrackLane = this._textTrackLanesByTextTrackId.get(trackId);

    if (!groupingLane || !textTrackLane) {
      console.error("text lane doesn't exist");
      return;
    }

    if (embedded) {
      this._renderedEmbeddedTextTracks.splice(index, 1);
    } else {
      this._renderedSidecarTextTracks.splice(index, 1);
    }

    timeline.removeTimelineLanes([groupingLane.id, textTrackLane.id]);
    this._groupingLanesByTextTrackId.delete(trackId);
    this._textTrackLanesByTextTrackId.delete(trackId);
  }

  /**
   * Adds zoom buttons and click event to scrubber lane.
   *
   * @returns
   */
  private processScrubberLane() {
    const timeline = this._timeline();
    if (!timeline) {
      console.error('No timeline is present');
      return;
    }

    let scrubberLane = timeline.getScrubberLane();

    scrubberLane.setStyle(Constants.TIMELINE_LANE_STYLE);

    // scrubberLane.onClick$.subscribe(() => {
    //   this.playerService.omakasePlayer!.player.seekTo(scrubberLane.getTimecodedPointerPositionTime());
    //   scrubberLane.
    // });

    let zoomInButton = new ImageButton({
      src: Constants.IMAGES.timeline.circlePlus,
      width: 30,
      height: 30,
      listening: true,
    });

    zoomInButton.onEvent$.subscribe({
      next: (event) => {
        if (event.type === TimelineNodeEventType.TIMELINE_NODE_CLICK) {
          timeline.zoomInEased().subscribe();
        }
      },
    });

    let zoomOutButton = new ImageButton({
      src: Constants.IMAGES.timeline.circleMinus,
      width: 30,
      height: 30,
      listening: true,
    });

    zoomOutButton.onEvent$.subscribe({
      next: (event) => {
        if (event.type === TimelineNodeEventType.TIMELINE_NODE_CLICK) {
          timeline.zoomOutEased().subscribe();
        }
      },
    });

    scrubberLane.addTimelineNode({
      width: zoomOutButton.config.width!,
      height: zoomOutButton.config.height!,
      justify: 'end',
      margin: [0, 0, 0, 0],
      timelineNode: zoomOutButton,
    });

    scrubberLane.addTimelineNode({
      width: zoomInButton.config.width!,
      height: zoomInButton.config.height!,
      justify: 'end',
      margin: [0, -5, 0, 0],
      timelineNode: zoomInButton,
    });
  }

  private registerAdditionalShortcutsHelpMenuGroup() {
    const omakasePlayer = this.playerService.omakasePlayer!;
    const groupName = $localize`Additional Shortcuts`;
    const alreadyAdded = omakasePlayer.chroming.helpMenuGroups.some((g) => g.name === groupName);
    if (!alreadyAdded) {
      omakasePlayer.chroming.addHelpMenuGroup({name: groupName, items: [{description: 'Export Keyframe', name: 'SHIFT + E'}]}, HelpMenuGroupInsertPosition.APPEND);
    }
  }

  private registerMarkerShortcutsHelpMenuGroup() {
    const omakasePlayer = this.playerService.omakasePlayer!;
    const groupName = $localize`Marker Shortcuts`;
    const alreadyAdded = omakasePlayer.chroming.helpMenuGroups.some((g) => g.name === groupName);
    if (!alreadyAdded) {
      omakasePlayer.chroming.addHelpMenuGroup(MarkerShortcutUtil.getKeyboardShortcutsHelpMenuGroup(this.windowService.platform), HelpMenuGroupInsertPosition.APPEND);
    }
  }

  private wireSnapshotButton() {
    const button = document.getElementsByClassName('chroming-snapshot-button')[0];

    if (!button) {
      console.error('media chroming button does not exist');
      return;
    }

    button.addEventListener('click', () => this.takeSnapshot());
  }

  private takeSnapshot() {
    if (!this.canTakeSnapShot()) {
      return;
    }
    const omakasePlayer = this.playerService.omakasePlayer!;
    omakasePlayer.player.extractVideoKeyframe().subscribe((videoKeyFrame) => {
      if (!this._snapshotLane) {
        this.createSnapshotLane();
      }

      this.snapshotTrack!.addTimedItems(
        new DefaultThumbnail({
          url: videoKeyFrame.src,
          temporal: {
            type: TimedItemTemporalType.MOMENT,
            time: omakasePlayer.player.getCurrentTime().toString(),
          },
        })
      );
    });
  }

  private createSnapshotLane() {
    const timeline = this._timeline();
    if (!timeline) {
      console.error('No timeline is present');
      return;
    }

    const thumbnailLane = new ThumbnailTrackLane({
      style: Constants.THUMBNAIL_LANE_STYLE,
      description: 'Keyframes',
    });

    this.snapshotTrack = this.playerService.omakasePlayer!.track.add(new ThumbnailTrack({})) as ThumbnailTrack;
    thumbnailLane.setTrack(this.snapshotTrack);

    this._snapshotLane = thumbnailLane;

    this._snapshotLane.onEvent$.pipe(takeUntil(this._destroyed$)).subscribe((thumbnailTrackEvent) => {
      if (thumbnailTrackEvent.type === ThumbnailTrackLaneEventType.TIMELINE_THUMBNAIL_TRACK_LANE_THUMBNAIL_CLICK) {
        this.isSnapshotListShown.set(true);
      }
    });

    timeline.addTimelineLaneAtIndex(thumbnailLane, this.resolveSnapshotLaneIndex());
  }

  private canTakeSnapShot() {
    if (!this.snapshotTrack) {
      return true;
    }

    const omakasePlayer = this.playerService.omakasePlayer!;

    const currentTime = omakasePlayer.player.getCurrentTime();
    const frameDuration = omakasePlayer.player.mainMedia?.frameRateModel?.frameDuration;

    if (frameDuration === undefined) {
      return false; //this means no video
    }
    const rangeStart = Math.max(0, currentTime - frameDuration * 2);
    const rangeEnd = currentTime + frameDuration * 2;

    const foundThumbnails = this.snapshotTrack.findTimedItemsInRange(rangeStart, rangeEnd);
    const currentFrame = omakasePlayer.player.convertTime(currentTime, MediaTemporalFormat.SECONDS, MediaTemporalFormat.FRAME_COUNT);

    const doesSnapshotExistForCurrentFrame = foundThumbnails
      .map((thumbnail) => {
        const time = thumbnail.temporal.type === TimedItemTemporalType.MOMENT ? thumbnail.temporal.time : undefined;
        return time !== undefined ? omakasePlayer.player.convertTime(Number(time), MediaTemporalFormat.SECONDS, MediaTemporalFormat.FRAME_COUNT) : undefined;
      })
      .some((frame) => frame === currentFrame);

    return !doesSnapshotExistForCurrentFrame;
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (['INPUT', 'TEXTAREA'].includes(target.tagName.toUpperCase())) {
      return;
    }
    if (event.code === 'KeyE' && event.shiftKey) {
      this.takeSnapshot();
      event.preventDefault();
      return;
    }
    if (this.playerService.omakasePlayer) {
      const activeMarkerTrack = this.markerTrackService.activeMarkerTrack();
      const markerTrack = activeMarkerTrack?.id ? (this.playerService.omakasePlayer.track.get(activeMarkerTrack.id) as MarkerTrack) : undefined;
      const handled = MarkerShortcutUtil.handleKeyboardEvent(event, this.playerService.omakasePlayer, markerTrack, (markerId) => this.setMarkerFocus(markerId));
      if (handled) {
        event.preventDefault();
      }
    }
  }

  private createObservationLaneAtIndex(observationTrack: SidecarObservationTrack, index: number) {
    const timeline = this._timeline();
    const omakasePlayer = this.playerService.omakasePlayer;
    if (!timeline || !omakasePlayer) {
      console.error('No timeline or player is present');
      return;
    }

    if (!this._observationGroupingLane) {
      this._observationGroupingLane = new ObservationTrackGroupingLane({style: Constants.LABEL_LANE_STYLE, text: 'Observation Tracks'});
      const observationGroupingLaneIndex = this.resolveObservationLaneIndex(0) - 1; //index before the first observation lane
      timeline.addTimelineLaneAtIndex(this._observationGroupingLane, observationGroupingLaneIndex);
    }

    const scale = observationTrack.minValue !== undefined && observationTrack.maxValue !== undefined ? {min: observationTrack.minValue, max: observationTrack.maxValue} : undefined;

    const isLineChart = observationTrack.visualization === 'line-chart';

    const lane: BarChartLane | LineChartLane = isLineChart
      ? new LineChartLane({
          style: Constants.OBSERVATION_CHART_LANE_STYLE,
          description: observationTrack.label,
          loadingAnimation: true,
        })
      : new BarChartLane({
          style: Constants.OBSERVATION_CHART_LANE_STYLE,
          description: observationTrack.label,
          loadingAnimation: true,
        });

    const laneIndex = this.resolveObservationLaneIndex(index);
    timeline.addTimelineLaneAtIndex(lane, laneIndex);
    this._observationGroupingLane!.addChildLane(lane);
    this._renderedObservationTracks.splice(index, 0, observationTrack);
    this._renderedObservationLanes.splice(index, 0, lane);

    const loadedTrack = omakasePlayer.track.get(observationTrack.id) as ObservationTrack | undefined;
    if (!loadedTrack) {
      console.error('Observation track not present in player', observationTrack.id);
      return;
    }

    const measurements = this.resolveObservationMeasurements(loadedTrack);

    if (isLineChart) {
      const lineLane = lane as LineChartLane;
      const config: LineChartLaneTrackConfig = {
        scale,
        interpolationWidth: 5,
        style: {
          measurements: measurements.map((measurement) => ({
            ...Constants.OBSERVATION_LINE_CHART_MEASUREMENT_STYLE,
            measurement,
            lineStroke: observationTrack.color,
            pointFill: observationTrack.color,
          })),
        },
      };
      lineLane.addTrack(loadedTrack, config);
    } else {
      const barLane = lane as BarChartLane;
      const barType: 'default' | 'og' = observationTrack.visualization === 'led-chart' ? 'og' : 'default';
      const complementary = ColorUtil.getComplementaryColor(observationTrack.color);
      const config: BarChartLaneTrackConfig = {
        scale,
        interpolationWidth: Constants.OBSERVATION_BAR_CHART_INTERPOLATION_WIDTH,
        style: {
          measurements: measurements.map((measurement) => ({
            ...Constants.OBSERVATION_BAR_CHART_MEASUREMENT_STYLE,
            measurement,
            barType,
            fillLinearGradientColorStops: [0, observationTrack.color, 1, complementary],
          })),
        },
      };
      barLane.addTrack(loadedTrack, config);
    }
  }

  private resolveObservationMeasurements(track: ObservationTrack): (string | undefined)[] {
    console.log(track);
    const set = new Set<string | undefined>();
    track.timedItemsSorted.forEach((obs) => {
      obs.items.forEach((item) => set.add(item.measurement));
    });
    return [...set];
  }
}
