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
import {MarkerTrack, MarkerTrackService} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {LoadedSidecarText, SidecarTextService} from '../../fly-outs/add-sidecar-text-fly-out/text-sidecar.service';
import {ImageButton, MarkerLane, MomentMarker, PeriodMarker, SubtitlesLane, SubtitlesVttTrack, ThumbnailLane, TimelineApi} from '@byomakase/omakase-player';
import {PlayerService} from '../../player/player.service';
import {combineLatest, filter, Subject, takeUntil} from 'rxjs';
import {Constants} from '../../../constants/constants';
import {StringUtil} from '../../../common/util/string-util';
import {TextTrackGroupingLane} from '../../../common/timeline/grouping-lane/text-grouping-lane/text-track-grouping-lane';
import {MarkerListComponent} from '../../../common/marker-list/marker-list.component';
import {CueUtil} from '../../../common/util/cue-util';
import {ColorService} from '../../../common/services/color.service';
import {MarkerShortcutUtil} from '../../../common/util/marker-shortcut-util';

@Component({
  selector: 'app-timeline-layout',
  imports: [PlayerComponent, MarkerListComponent, IconDirective],
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
        @if (activeMarkerLane() && markerTrackService.activeMarkerTrack()) {
        <app-marker-list #markerList [source]="activeMarkerLane()" [readOnly]="markerTrackService.activeMarkerTrack()!.readOnly" [limitHeight]="true" />
        } @else {
        <div class="info-message">No marker tracks have been loaded. Click <i appIcon="pin"> </i>to load a marker track.</div>
        }
      </div>
    </div>
    <div class="south-pole">
      <div id="omakase-timeline"></div>
    </div>
  `,
})
export class TimelineLayoutComponent implements AfterViewInit, OnDestroy {
  public markerTrackService = inject(MarkerTrackService);
  public sidecarTextService = inject(SidecarTextService);
  public playerService = inject(PlayerService);
  private colorService = inject(ColorService);

  private _timeline = signal<TimelineApi | undefined>(undefined);
  private _destroyed$ = new Subject<void>();

  private _renderedMarkerTracks: MarkerTrack[] = [];
  private _renderedMarkerLanes: MarkerLane[] = [];

  private _isThumbnailTrackRendered: boolean = false;

  private _renderedEmbeddedTextTracks: SubtitlesVttTrack[] = [];
  private _renderedSidecarTextTracks: LoadedSidecarText[] = [];

  private _groupingLanesByTextTrackId: Map<string, TextTrackGroupingLane> = new Map();
  private _subtitleLanesByTextTrackId: Map<string, SubtitlesLane> = new Map();

  private _isInitialRenderDone = signal<boolean>(false);
  public activeMarkerLane = signal<MarkerLane | undefined>(undefined);

  @ViewChild('leftSide') leftSideRef!: ElementRef;
  @ViewChild('rightSide') rightSideRef!: ElementRef;

  private resizeObserver!: ResizeObserver;

  constructor() {
    // sync newly created or deleted marker tracks with timeline
    effect(() => {
      if (!this._timeline() || !this._isInitialRenderDone()) {
        return;
      }
      this._renderedMarkerTracks.forEach((markerTrack, index) => {
        if (!this.markerTrackService.markerTracks().includes(markerTrack)) {
          this.removeMarkerLaneAtIndex(index);
        }
      });
      this.markerTrackService.markerTracks().forEach((serviceMarkerTrack) => {
        if (!this._renderedMarkerTracks.includes(serviceMarkerTrack)) {
          this.createMarkerLaneAtIndex(serviceMarkerTrack, this._renderedMarkerTracks.length);
        }
      });
    });

    // sync newly created or deleted text tracks with timeline
    effect(() => {
      if (!this._timeline() || !this._isInitialRenderDone()) {
        return;
      }
      this._renderedSidecarTextTracks.forEach((sidecarText, index) => {
        if (!this.sidecarTextService.loadedSidecarTexts().includes(sidecarText)) {
          this.removeTextLaneAtIndex(index);
        }
      });
      this.sidecarTextService.loadedSidecarTexts().forEach((sidecarText) => {
        if (!this._renderedSidecarTextTracks.includes(sidecarText)) {
          this.createTextLaneAtIndex(sidecarText, this._renderedSidecarTextTracks.length, false);
        }
      });
    });

    // sync active marker track with active marker lane
    effect(() => {
      const activeMarkerTrack = this.markerTrackService.activeMarkerTrack();
      if (activeMarkerTrack) {
        const index = this._renderedMarkerTracks.findIndex((track) => track === activeMarkerTrack);
        this.activeMarkerLane.set(this._renderedMarkerLanes[index]);
      }
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

    this.playerService.onCreated$
      .pipe(
        filter((p) => !!p),
        takeUntil(this._destroyed$)
      )
      .subscribe((player) => {
        combineLatest([player.video.onVideoLoaded$, player.subtitles.onSubtitlesLoaded$])
          .pipe(
            filter(([video, subtitles]) => !!video && !!subtitles),
            takeUntil(this._destroyed$)
          )
          .subscribe(() => {
            this._timeline()?.destroy();
            this._renderedEmbeddedTextTracks = [];
            this._renderedMarkerLanes = [];
            this._renderedMarkerTracks = [];
            this._renderedSidecarTextTracks = [];

            player.createTimeline(Constants.TIMELINE_CONFIG).subscribe((timelineApi) => {
              this._timeline.set(timelineApi);
              this.processScrubberLane();
              this.createMarkerLanes();
              this.createThumbnailLane();
              this.createEmbeddedTextLanes();
              this.createSidecarTextLanes();
              this._isInitialRenderDone.set(true);

              player.video.appendHelpMenuGroup(MarkerShortcutUtil.getKeyboardShortcutsHelpMenuGroup('unknown'));
            });
          });
      });
  }

  /**
   * Render marker lanes for each marker track. Only used during the initialization.
   */
  private createMarkerLanes() {
    const markerTracks = this.markerTrackService.markerTracks();
    markerTracks.forEach((markerTrack, index) => {
      this.createMarkerLaneAtIndex(markerTrack, index);
    });
  }

  /**
   * Render text grouping lanes for each embedded text track. Only used during the initialization.
   */
  private createEmbeddedTextLanes() {
    const subtitlesTracks = this.playerService.omakasePlayer!.subtitles.getTracks().filter((track) => track.embedded);

    subtitlesTracks.forEach((subtitlesTrack, index) => {
      this.createTextLaneAtIndex(subtitlesTrack, index, true);
    });
  }

  /**
   * Render text grouping lanes for each sidecar text track. Only used during the initialization.
   */
  private createSidecarTextLanes() {
    const sidecarTexts = this.sidecarTextService.loadedSidecarTexts();

    sidecarTexts.forEach((subtitlesTrack, index) => {
      this.createTextLaneAtIndex(subtitlesTrack, index, false);
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
  private createMarkerLaneAtIndex(markerTrack: MarkerTrack, index: number) {
    if (!this._timeline()) {
      console.error('No timeline is present');
      return;
    }

    const colorResolver = this.colorService.createColorResolver(crypto.randomUUID(), this.markerTrackService.HEX_COLORS);
    const markerLane = new MarkerLane({
      vttUrl: markerTrack.src,
      description: markerTrack.label ?? '',
      style: Constants.MARKER_LANE_STYLE,
      markerCreateFn: (cue, index) => {
        const name = CueUtil.extractName(cue.text);
        const color = markerTrack.color !== 'multicolor' ? markerTrack.color : colorResolver.getColorByIndex(index);

        if (cue.endTime - cue.startTime < 1) {
          return new MomentMarker({
            timeObservation: {
              time: cue.startTime,
            },
            style: {
              ...Constants.MOMENT_MARKER_STYLE,
              color: color,
            },
            editable: !markerTrack.readOnly,
            text: name === '' ? `Marker ${index + 1}` : name,
          });
        } else {
          const periodMarkerStyle = markerTrack.readOnly ? Constants.PERIOD_MARKER_STYLE_READ_ONLY : Constants.PERIOD_MARKER_STYLE;
          return new PeriodMarker({
            timeObservation: {
              start: cue.startTime,
              end: cue.endTime,
            },
            style: {
              ...periodMarkerStyle,
              color: color,
            },
            editable: !markerTrack.readOnly,
            text: name === '' ? `Marker ${index + 1}` : name,
          });
        }
      },
      markerProcessFn: (marker) => {
        marker.onClick$.subscribe(() => {
          markerLane.toggleMarker(marker.id);

          if (this.markerTrackService.activeMarkerTrack() !== markerTrack) {
            this.markerTrackService.activeMarkerTrack.set(markerTrack);
          }

          this._renderedMarkerLanes
            .filter((rl) => rl !== markerLane)
            .forEach((lane) => {
              const selectedMarker = lane.getSelectedMarker();
              if (selectedMarker) {
                lane.toggleMarker(selectedMarker.id);
              }
            });
        });

        marker.onMouseEnter$.subscribe(() => {
          document.body.style.cursor = 'pointer';
        });

        marker.onMouseOut$.subscribe(() => {
          document.body.style.cursor = 'unset';
        });
      },
    });

    this._timeline()!.addTimelineLaneAtIndex(markerLane, this.resolveMarkerLaneIndex(index));
    this._renderedMarkerTracks.splice(index, 0, markerTrack);
    this._renderedMarkerLanes.splice(index, 0, markerLane);

    if (this.markerTrackService.activeMarkerTrack() === markerTrack) {
      this.activeMarkerLane.set(markerLane);
    }
  }

  /**
   * Maps marker lane index to timeline lane index
   * @param index - Index with respect to marker lanes
   * @returns Index with respect to all timeline lanes
   */
  private resolveMarkerLaneIndex(index: number) {
    return index + 1; // scrubber lane is at 0
  }

  /**
   * Returns the timeline index of the thumbnail lane. There can only be one thumbnail lane.
   * @returns Index with respect to all timeline lanes
   */
  private resolveThumbnailLaneIndex() {
    return this._renderedMarkerTracks.length + 1; // scrubber at 0
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

    // scrubber at 0, each text track has 2 lanes
    return numberOfMarkerLanes + numberOfThumbnailLanes + 2 * (index + numberOfEmbeddedTextLanes) + 1;
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

    const thumbnailTrackUrl = this.playerService.thumbnailTrackUrl();

    if (!thumbnailTrackUrl) {
      return;
    }

    const thumbnailLane = new ThumbnailLane({
      vttUrl: thumbnailTrackUrl,
      style: Constants.THUMBNAIL_LANE_STYLE,
    });

    timeline.addTimelineLaneAtIndex(thumbnailLane, this.resolveThumbnailLaneIndex());
    this._isThumbnailTrackRendered = true;
  }

  /**
   * Creates text track grouping lane and subtitle lane for a text track.
   *
   * @param textTrack - Text track to be visualized.
   * @param index - Index with respect to either embedded or sidecar text tracks.
   * @param embedded - Flag that specifies text track family
   * @returns
   */
  private createTextLaneAtIndex(textTrack: LoadedSidecarText | SubtitlesVttTrack, index: number, embedded = false) {
    const timeline = this._timeline();
    if (!timeline) {
      console.error('No timeline is present');
      return;
    }

    const labelLaneIndex = this.resolveTextLaneIndex(index, embedded);
    const labelText = textTrack.label && textTrack.label !== '' ? ` (${textTrack.label})` : '';

    const groupingLane = new TextTrackGroupingLane(
      {
        textTrack: textTrack,
        text: `${StringUtil.leafUrlToken(textTrack.src)}${labelText}`,
        style: Constants.LABEL_LANE_STYLE,
      },
      this.playerService!.omakasePlayer!.subtitles
    );

    const subtitlesLane = new SubtitlesLane({
      vttUrl: textTrack.src,
      style: Constants.SUBTITLES_LANE_STYLE,
    });

    groupingLane.addChildLane(subtitlesLane);

    timeline.addTimelineLaneAtIndex(groupingLane, labelLaneIndex);
    timeline.addTimelineLaneAtIndex(subtitlesLane, labelLaneIndex + 1);

    this._groupingLanesByTextTrackId.set(textTrack.id, groupingLane);
    this._subtitleLanesByTextTrackId.set(textTrack.id, subtitlesLane);

    if (embedded) {
      this._renderedEmbeddedTextTracks.push(textTrack as SubtitlesVttTrack);
    } else {
      this._renderedSidecarTextTracks.push(textTrack);
    }
  }

  /**
   * Removes a text lane at specified sidecar or embedded track index
   *
   * @param index - Index with respect to either embedded or sidecar text tracks.
   * @param embedded - Flag that specifies text track family.
   * @returns
   */
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

    const labelLane = this._groupingLanesByTextTrackId.get(textTrack.id);
    const subtitlesLane = this._subtitleLanesByTextTrackId.get(textTrack.id);

    if (!labelLane || !subtitlesLane) {
      console.error("text lane doesn't exist");
      return;
    }

    if (embedded) {
      this._renderedEmbeddedTextTracks.splice(index, 1);
    } else {
      this._renderedSidecarTextTracks.splice(index, 1);
    }
    this._timeline()!.removeTimelineLanes([labelLane.id, subtitlesLane.id]);
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

    scrubberLane.style = Constants.TIMELINE_LANE_STYLE;

    scrubberLane.onClick$.subscribe(() => {
      this.playerService.omakasePlayer!.video.seekToTime(scrubberLane.getTimecodedPointerPositionTime());
    });

    let zoomInButton = new ImageButton({
      src: Constants.IMAGES.timeline.circlePlus,
      width: 30,
      height: 30,
      listening: true,
    });

    zoomInButton.onClick$.subscribe({
      next: (event) => {
        timeline.zoomInEased().subscribe();
      },
    });

    let zoomOutButton = new ImageButton({
      src: Constants.IMAGES.timeline.circleMinus,
      width: 30,
      height: 30,
      listening: true,
    });

    zoomOutButton.onClick$.subscribe({
      next: (event) => {
        timeline.zoomOutEased().subscribe();
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

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    if (this.playerService.omakasePlayer) {
      const isHandled = MarkerShortcutUtil.handleKeyboardEvent(event, this.playerService.omakasePlayer, this.activeMarkerLane());
      if (isHandled) {
        event.preventDefault();
      }
    }
  }
}
