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

import {afterNextRender, afterRenderEffect, AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, inject, Injector, OnDestroy, signal, untracked, viewChild, ChangeDetectionStrategy} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {PlayerService} from '../../player/player.service';
import {debounceTime, EMPTY, filter, merge, Subject, switchMap, takeUntil, tap, timer} from 'rxjs';
import {TextTrack, FileFormatType, TextTrackLane, TimelineApi, RelationType, ThumbnailTrackLane, TextCue, TimedItemTemporalType, TextTrackType, PlayerEventType} from '@byomakase/omakase-player';
import {TextTrackEditor} from '../../../common/text-track-editor/text-track-editor.component';
import {Constants} from '../../../constants/constants';
import {SidecarTextService} from '../../fly-outs/add-sidecar-text-fly-out/text-sidecar.service';

@Component({
  selector: 'app-text-layout',
  imports: [PlayerComponent, TextTrackEditor],
  host: {'class': 'text-layout'},
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div #leftSide class="left-side">
      <div class="player-wrapper">
        <app-player></app-player>
      </div>
      @if (isTimelineVisible()) {
        <div #timelineContainer id="omakase-timeline"></div>
      }
    </div>
    <div #rightSide class="right-side">
      <div class="editor-container">
        @if (editorTextTrack()) {
          <div class="editor-label-container">
            <div class="editor-label">{{ editorTextTrack()!.label }}</div>
          </div>
          <app-text-track-editor (requestLatestTime)="provideLatestTime()" (cueClicked)="handleCueClick($event)" [textTrack]="editorTextTrack()!" [timeProvider$]="timeProvider$">
          </app-text-track-editor>
        }
      </div>
    </div>
  `,
})
export class TextLayoutComponent implements OnDestroy, AfterViewInit {
  private destroyed$ = new Subject<void>();

  private playerService = inject(PlayerService);
  private sidecarTextService = inject(SidecarTextService);
  private textTrackLane = signal<TextTrackLane | undefined>(undefined);

  public timelineTextTrack = signal<TextTrack | undefined>(undefined);
  public editorTextTrack = signal<TextTrack | undefined>(undefined);
  public isTimelineVisible = signal<boolean>(false);
  public timeProvider$ = new Subject<number>();

  timelineContainer = viewChild<ElementRef<HTMLDivElement>>('timelineContainer');
  leftSide = viewChild<ElementRef<HTMLDivElement>>('leftSide');
  rightSide = viewChild<ElementRef<HTMLDivElement>>('rightSide');

  private resizeObserver: ResizeObserver | undefined;
  private _timeline: TimelineApi | undefined;

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.destroyed$.next();
    this.destroyed$.complete();
    this.releaseTimeline();
  }

  private releaseTimeline() {
    this._timeline = undefined;
  }

  constructor() {
    effect(() => {
      if (this.textTrackLane() && this.timelineTextTrack()) {
        this.textTrackLane()!.setTrack(this.timelineTextTrack()!);
      }
    });

    effect(() => {
      const timelineContainer = this.timelineContainer();
      if (timelineContainer) {
        this.createTimeline();
      }
    });

    afterRenderEffect(() => {
      const track = this.editorTextTrack();
      if (track) {
        untracked(() => this.provideLatestTime());
      }
    });
  }

  ngAfterViewInit(): void {
    const leftEl = this.leftSide()!.nativeElement;
    const rightEl = this.rightSide()!.nativeElement;

    this.resizeObserver = new ResizeObserver(([entry]) => {
      rightEl.style.height = `${entry.contentRect.height}px`;
    });
    this.resizeObserver.observe(leftEl);

    this.playerService.onCreated$
      .pipe(
        takeUntil(this.destroyed$),
        switchMap((omakasePlayer) => {
          if (!omakasePlayer) return EMPTY;
          return omakasePlayer.player.onEvent$.pipe(filter((e) => e.type === PlayerEventType.PLAYER_MAIN_MEDIA_UNLOADING));
        })
      )
      .subscribe(() => this.tearDown());

    this.playerService
      .observeMediaLoads(this.destroyed$)
      .pipe(
        switchMap((omakasePlayer) => {
          if (!omakasePlayer) {
            this.tearDown();
            return EMPTY;
          }
          this.resolveTimelineVisibility();
          this.setActiveTextTrack();
          return merge(
            omakasePlayer.player.text.onEvent$.pipe(
              debounceTime(10),
              tap(() => {
                this.resolveTimelineVisibility();
                this.setActiveTextTrack();
              })
            ),
            omakasePlayer.player.onEvent$.pipe(
              //   filter((event) => event.type === PlayerEventType.PLAYER_PLAYBACK_PROGRESS),
              filter(() => !!omakasePlayer.player.mainMedia),
              tap(() => this.timeProvider$.next(omakasePlayer.player.getCurrentTime()))
            )
          );
        })
      )
      .subscribe();
  }

  private setActiveTextTrack() {
    const omakasePlayer = this.playerService.omakasePlayer!;
    const activePlayerTextTrackState = [...omakasePlayer.player.text.state.tracks.MAIN, ...omakasePlayer.player.text.state.tracks.SIDECAR].find((textTrack) => textTrack.active);

    if (!activePlayerTextTrackState) {
      this.timelineTextTrack.set(undefined);
      this.editorTextTrack.set(undefined);
      return;
    }

    const activeTrack = omakasePlayer.track.get(activePlayerTextTrackState.trackId)! as TextTrack;

    if (activeTrack.sourceFileFormatType !== FileFormatType.VTT) {
      this.timelineTextTrack.set(undefined);
      this.editorTextTrack.set(undefined);
      return;
    }

    this.timelineTextTrack.set(activeTrack);
    const originalSidecarIds = new Set(this.sidecarTextService.loadedSidecarTexts().map((t) => t.id));
    const derivedFromRelation = activeTrack.relations.find((r) => r.relationType === RelationType.DERIVED_FROM && originalSidecarIds.has(r.entityId));
    const editorTrack = derivedFromRelation ? (omakasePlayer.track.get(derivedFromRelation.entityId) as TextTrack) : activeTrack;

    if (!editorTrack) {
      this.editorTextTrack.set(undefined);
      return;
    }

    if (editorTrack.areTimedItemsFetched) {
      this.editorTextTrack.set(editorTrack);
    } else {
      omakasePlayer.track.utils
        .fetchTimedItems(editorTrack.id)
        .pipe(takeUntil(this.destroyed$))
        .subscribe(() => {
          this.editorTextTrack.set(editorTrack);
        });
    }
  }

  private resolveTimelineVisibility() {
    const omakasePlayer = this.playerService.omakasePlayer!;
    this.isTimelineVisible.set([...omakasePlayer.player.text.state.tracks.MAIN, ...omakasePlayer.player.text.state.tracks.SIDECAR].length > 0);
  }

  private tearDown() {
    this.releaseTimeline();
    this.isTimelineVisible.set(false);
    this.timelineTextTrack.set(undefined);
    this.editorTextTrack.set(undefined);
    this.textTrackLane.set(undefined);
  }

  private createTimeline() {
    // createTimeline() below destroys any timeline the player still holds, this one included
    this.releaseTimeline();

    const omakasePlayer = this.playerService.omakasePlayer!;

    omakasePlayer.createTimeline(Constants.TEXT_LAYOUT.COMPACT_TIMELINE_CONFIG).subscribe((timelineApi) => {
      this._timeline = timelineApi;
      timelineApi.zoomTo(Constants.TEXT_LAYOUT.VARIABLES.zoomMax);
      this.processScrubberLane(timelineApi);

      if (this.playerService.thumbnailTrack()) {
        const thumbnailLane = new ThumbnailTrackLane({style: Constants.TEXT_LAYOUT.THUMBNAIL_LANE_STYLE});
        thumbnailLane.setTrack(this.playerService.thumbnailTrack()!);
        timelineApi.addTimelineLane(thumbnailLane);
      }

      const textTrackLane = new TextTrackLane({style: Constants.TEXT_LAYOUT.TEXT_TRACK_LANE_STYLE});
      this.textTrackLane.set(textTrackLane);
      timelineApi.addTimelineLane(textTrackLane);
    });
  }

  /**
   * Adds zoom buttons and click event to scrubber lane.
   *
   * @returns
   */
  private processScrubberLane(timeline: TimelineApi) {
    if (!timeline) {
      console.error('No timeline is present');
      return;
    }

    let scrubberLane = timeline.scrubberLane;

    scrubberLane.setStyle(Constants.TIMELINE_LANE_STYLE);
  }

  public handleCueClick(cue: TextCue) {
    const omakasePlayer = this.playerService.omakasePlayer!;

    if (cue.temporal.type !== TimedItemTemporalType.SPAN) {
      return;
    }

    omakasePlayer.player.pause();

    const start = Number(cue.temporal.start);
    const frameBasedOffset = (omakasePlayer.player.mainMedia?.frameRateModel?.frameDuration ?? 0.01) / 10;
    const durationBasedOffset = Number(cue.temporal.end) - start;
    omakasePlayer.player.seekTo(start + Math.min(frameBasedOffset, durationBasedOffset)).subscribe(() => omakasePlayer.timeline?.scrollToPlayheadEased());
  }

  public provideLatestTime() {
    if (this.playerService.omakasePlayer) {
      this.timeProvider$.next(this.playerService.omakasePlayer.player.getCurrentTime());
    }
  }
}
