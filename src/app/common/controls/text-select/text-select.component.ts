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
import {EMPTY, filter, Subject, switchMap} from 'rxjs';
import {PlayerService} from '../../../components/player/player.service';
import {LoadedSidecarText, SidecarText, SidecarTextService} from '../../../components/fly-outs/add-sidecar-text-fly-out/text-sidecar.service';
import {StringUtil} from '../../util/string-util';
import {PlayerTextEventType, TextTrack} from '@byomakase/omakase-player';

/**
 * Selection component that allows for changing currently selected text track.
 * It handles text track change and its logic is self contained.
 */
@Component({
  selector: 'app-text-select',
  imports: [ReactiveFormsModule],
  template: `
    <select [formControl]="selectControl">
      @if (areSubtitlesLoaded()) {
        @for (track of textTracks(); track track) {
          <option [value]="track.id">{{ resolveTrackDisplayName(track) }}</option>
        }
      }
    </select>
  `,
})
export class SidecarTextSelectComponent implements AfterViewInit, OnDestroy {
  selectControl = new FormControl();

  textTracks = computed(() => {
    return [...this.mainTextTracks(), ...this.sidecarTextservice.loadedSidecarTexts()];
  });
  mainTextTracks = signal<TextTrack[]>([]);

  areSubtitlesLoaded = signal(false);
  private destroyed$ = new Subject<void>();

  constructor(
    private playerService: PlayerService,
    private sidecarTextservice: SidecarTextService
  ) {}

  ngAfterViewInit(): void {
    this.selectControl.valueChanges.subscribe((id) => {
      const omakasePlayer = this.playerService.omakasePlayer;
      if (omakasePlayer) {
        omakasePlayer.player.text.switchTrack(id);
      }
    });

    this.playerService
      .observeMediaLoads(this.destroyed$)
      .pipe(
        switchMap((omakasePlayer) => {
          if (!omakasePlayer) {
            return EMPTY;
          }
          this.mainTextTracks.set(omakasePlayer.player.text.state.tracks['MAIN'].map((textTrackState) => omakasePlayer.track.get(textTrackState.trackId)! as TextTrack));

          const activeTrackId =
            omakasePlayer.player.text.state.tracks['MAIN'].find((textTrackState) => textTrackState.active)?.trackId ??
            omakasePlayer.player.text.state.tracks['SIDECAR']?.find((textTrackState) => textTrackState.active)?.trackId;
          if (activeTrackId) {
            this.selectControl.setValue(activeTrackId, {emitEvent: false});
          }

          this.areSubtitlesLoaded.set(true);

          return omakasePlayer.player.text.onEvent$.pipe(filter((event) => event.type === PlayerTextEventType.PLAYER_TEXT_TRACK_SWITCHED || event.type === PlayerTextEventType.PLAYER_TEXT_CHANGE));
        })
      )
      .subscribe((textEvent) => {
        if (textEvent.type === PlayerTextEventType.PLAYER_TEXT_TRACK_SWITCHED) {
          if (textEvent.data.playerTextTrack.trackId !== this.selectControl.value) {
            this.selectControl.setValue(textEvent.data.playerTextTrack.trackId, {emitEvent: false});
          }
        } else if (textEvent.type === PlayerTextEventType.PLAYER_TEXT_CHANGE) {
          const activeTrack = textEvent.data.playerText.tracks['MAIN'].find((t) => t.active) ?? textEvent.data.playerText.tracks['SIDECAR']?.find((t) => t.active);
          if (activeTrack && activeTrack.trackId !== this.selectControl.value) {
            this.selectControl.setValue(activeTrack.trackId, {emitEvent: false});
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  resolveTrackDisplayName(track: LoadedSidecarText | TextTrack) {
    const omakasePlayer = this.playerService.omakasePlayer;

    if (!omakasePlayer) {
      return;
    }

    if (!omakasePlayer.player.mainMedia) {
      return;
    }

    const isEmbedded = omakasePlayer.player.text.state.tracks['MAIN'].find((playerTextTrack) => playerTextTrack.trackId === track.id);

    if (!isEmbedded) {
      if (track.label) {
        return track.label;
      } else if ('src' in track) {
        return StringUtil.leafUrlToken(track.src!);
      }
    }

    // if ('language' in track && track.language) {
    //   return track.language.toUpperCase();
    // }

    if (track.label) {
      return StringUtil.toMixedCase(track.label);
    }

    return 'Main Text';
  }
}
