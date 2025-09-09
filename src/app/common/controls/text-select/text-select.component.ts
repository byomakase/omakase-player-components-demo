import {AfterViewInit, Component, computed, HostBinding, inject, input, Input, OnDestroy, OnInit, output, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {SubtitlesVttTrack} from '@byomakase/omakase-player';
import {Subject, takeUntil} from 'rxjs';
import {PlayerService} from '../../../components/player/player.service';
import {SidecarText, SidecarTextService} from '../../../components/fly-outs/add-sidecar-text-fly-out/text-sidecar.service';
import {StringUtil} from '../../util/string-util';

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
      throw new Error('Omakase player not loaded');
    }

    if (!player.video.getVideo()) {
      throw new Error('Video not loaded');
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
