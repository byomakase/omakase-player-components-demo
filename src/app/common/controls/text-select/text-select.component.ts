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
import {AfterViewInit, Component, computed, OnDestroy, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {SubtitlesVttTrack} from '@byomakase/omakase-player';
import {Subject, takeUntil} from 'rxjs';
import {PlayerService} from '../../../components/player/player.service';
import {SidecarText, SidecarTextService} from '../../../components/fly-outs/add-sidecar-text-fly-out/text-sidecar.service';
import {StringUtil} from '../../util/string-util';

/**
 * Selection component that allows for changing currently selected text track.
 * It handles text track change and its logic is self contained.
 */
@Component({
  selector: 'app-text-select',
  imports: [ReactiveFormsModule],
  template: `
    <select [formControl]="selectControl">
      @if (areSubtitlesLoaded()) { @for(track of textTracks(); track track) {
      <option [value]="track.id">{{ resolveTrackDisplayName(track) }}</option>
      } }
    </select>
  `,
})
export class SidecarTextSelectComponent implements AfterViewInit, OnDestroy {
  selectControl = new FormControl();

  textTracks = computed(() => {
    return [...this.mainTextTracks(), ...this.sidecarTextservice.sidecarTexts()];
  });
  mainTextTracks = signal<SubtitlesVttTrack[]>([]);

  areSubtitlesLoaded = signal(false);
  private destroyed$ = new Subject<void>();

  constructor(private playerService: PlayerService, private sidecarTextservice: SidecarTextService) {}

  ngAfterViewInit(): void {
    this.selectControl.valueChanges.subscribe((id) => {
      const player = this.playerService.omakasePlayer;
      if (player) {
        player.subtitles.showTrack(id);
      }
    });

    this.playerService.onCreated$.pipe(takeUntil(this.destroyed$)).subscribe((player) => {
      if (player) {
        player.subtitles.onSubtitlesLoaded$.pipe(takeUntil(this.destroyed$)).subscribe((subtitlesLoadedEvent) => {
          if (!subtitlesLoadedEvent) {
            return;
          }
          this.mainTextTracks.set(subtitlesLoadedEvent.tracks);

          const activeTrack = player.subtitles.getActiveTrack();
          if (activeTrack) {
            this.selectControl.setValue(activeTrack.id);
          }

          this.areSubtitlesLoaded.set(true);
        });

        player.subtitles.onShow$.pipe(takeUntil(this.destroyed$)).subscribe((subtitleEvent) => {
          if (subtitleEvent.currentTrack?.id !== this.selectControl.value) this.selectControl.setValue(subtitleEvent.currentTrack?.id);
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  resolveTrackDisplayName(track: SidecarText) {
    const player = this.playerService.omakasePlayer;

    if (!player) {
      return;
    }

    if (!player.video.getVideo()) {
      return;
    }

    if (!track.embedded) {
      if (track.label) {
        return track.label;
      } else {
        return StringUtil.leafUrlToken(track.src!);
      }
    }

    if (track.language) {
      return track.language.toUpperCase();
    }

    if (track.label) {
      return StringUtil.toMixedCase(track.label);
    }

    return 'Main Text';
  }
}
