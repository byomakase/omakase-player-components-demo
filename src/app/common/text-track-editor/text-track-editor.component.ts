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

import {AfterViewInit, Component, effect, ElementRef, inject, input, output, signal, ViewChild} from '@angular/core';
import {
  FileFormatType,
  PlayerTextHandlerType,
  Relation,
  RelationType,
  TextCue,
  TextTrack,
  TimedItemsTrackEventEmitter,
  TimedItemsTrackItemEventType,
  TimedItemTemporalType,
  TrackType,
  UrlSource,
} from '@byomakase/omakase-player';
import {TextCueView} from './text-cue-view.component';
import {PlayerService} from '../../components/player/player.service';
import {map, Observable, Subject, switchMap, takeUntil} from 'rxjs';
import {VttUtil} from '../util/vtt-util';

@Component({
  selector: 'app-text-track-editor',
  standalone: true,
  imports: [TextCueView],
  template: `
    <div #editor class="text-track-editor">
      @for (timedItem of textTrack().timedItemsSorted; track timedItem.id) {
        <app-text-cue-view
          (click)="handleCueClick(timedItem)"
          [className]="activeCueIds().has(timedItem.id) ? 'active' : ''"
          id="text-cue-view-{{ timedItem.id }}"
          [textCue]="timedItem"
          [textTrack]="textTrack()"
          (edited)="loadEditedTextCues()"
        ></app-text-cue-view>
      }
    </div>
  `,
})
export class TextTrackEditor implements AfterViewInit {
  public textTrack = input.required<TextTrack>();
  public activeCueIds = signal<Set<string>>(new Set());
  public cueClicked = output<TextCue>();
  public timeProvider$ = input.required<Observable<number>>();
  private playerService = inject(PlayerService);
  private textTrackEventEmitter: TimedItemsTrackEventEmitter | undefined;
  private textTrackObserverBreaker$ = new Subject<void>();
  @ViewChild('editor', {static: true})
  editor!: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      this.textTrackObserverBreaker$.next();
      const textTrack = this.textTrack();
      this.activeCueIds.set(new Set());

      this.textTrackEventEmitter = new TimedItemsTrackEventEmitter(textTrack, this.timeProvider$());
      this.textTrackEventEmitter.onEvent$.pipe(takeUntil(this.textTrackObserverBreaker$)).subscribe((timedItemsTrackItemEvent) => {
        if (timedItemsTrackItemEvent.type === TimedItemsTrackItemEventType.TIMED_ITEMS_TRACK_ITEM_ENTRY) {
          const entered = timedItemsTrackItemEvent.data.exactItems;
          if (!entered.length) return;
          this.activeCueIds.update((ids) => {
            const next = new Set(ids);
            entered.forEach((item) => next.add(item.id));
            return next;
          });
          const last = entered.at(-1)!;
          const el = document.getElementById(`text-cue-view-${last.id}`);
          if (el && !this.isVisible(el)) {
            el.scrollIntoView({behavior: 'smooth', block: 'start'});
          }
        } else if (timedItemsTrackItemEvent.type === TimedItemsTrackItemEventType.TIMED_ITEMS_TRACK_ITEM_EXIT) {
          this.activeCueIds.update((ids) => {
            const next = new Set(ids);
            timedItemsTrackItemEvent.data.items.forEach((item) => next.delete(item.id));
            return next;
          });
        }
      });
    });
  }

  ngAfterViewInit(): void {}

  isVisible(el: HTMLElement): boolean {
    const containerRect = this.editor.nativeElement.parentElement!.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    return elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom;
  }

  handleCueClick(cue: TextCue) {
    this.activeCueIds.update((ids) => new Set([...ids, cue.id]));
    this.cueClicked.emit(cue);
  }

  loadEditedTextCues() {
    const omakasePlayer = this.playerService.omakasePlayer!;
    const sourceTrackId = this.textTrack().id;

    let handlerType;

    // Remove any existing sidecars derived from this source track before loading the new edit
    [...omakasePlayer.player.text.state.tracks.SIDECAR].forEach((sidecarState) => {
      const track = omakasePlayer.track.get(sidecarState.trackId) as TextTrack;
      if (track?.relations?.some((r) => r.relationType === RelationType.DERIVED_FROM && r.entityId === sourceTrackId)) {
        handlerType = omakasePlayer.player.text.getHandler(sidecarState.trackId)?.handlerType;

        omakasePlayer.player.removeSidecarTrack(sidecarState.trackId);
        omakasePlayer.track.delete(sidecarState.trackId);
      }
    });

    const isOriginalInPlayer = [...omakasePlayer.player.text.state.tracks.MAIN, ...omakasePlayer.player.text.state.tracks.SIDECAR].find((t) => t.trackId === sourceTrackId);
    if (isOriginalInPlayer) {
      handlerType = omakasePlayer.player.text.getHandler(sourceTrackId)?.handlerType;

      omakasePlayer.player.removeSidecarTrack(sourceTrackId);
    }

    const vttUrl = VttUtil.createBlobUrl(this.textTrack().timedItems);

    omakasePlayer.player
      .loadSidecarTrack(UrlSource.of(vttUrl), {
        trackType: TrackType.TEXT_TRACK,
        fileFormatType: FileFormatType.VTT,
        handlerType: handlerType ?? PlayerTextHandlerType.MEDIA_CAPTIONS,
        args: {
          label: this.textTrack().label,
          relations: [Relation.of(RelationType.DERIVED_FROM, sourceTrackId, this.textTrack().mediaType)],
        },
      })
      .pipe(
        switchMap((editedTextTrack) => {
          return omakasePlayer.track.utils.fetchTimedItems(editedTextTrack.id).pipe(map(() => editedTextTrack));
        })
      )
      .subscribe((editedTextTrack) => {
        omakasePlayer.player.text.switchTrack(editedTextTrack.id);
      });
  }
}
