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

import {AfterViewInit, Component, DestroyRef, ElementRef, inject, Injector, input, OnDestroy, signal, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {takeUntilDestroyed, toObservable} from '@angular/core/rxjs-interop';
import {PlayerService} from '../../player/player.service';
import {AudioHandlerBundle} from './audio-layout.component';
import {SidecarAudioService} from '../../fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {KnobWrapperComponent} from '../../../common/controls/knob/knob.component';
import {AudioHandlerEventType, PeakProcessorAudioLevelSource, VuMeter, VuMeterConfig, VuMeterOrientation, VuMeterScale, VuMeterTheme} from '@byomakase/omakase-player';
import {distinctUntilChanged, filter, switchMap} from 'rxjs';

// Approximation of the previous vertical gradient as discrete dB color bands
// (gradient stops were spread across the -60..0 dB range, bottom -> top).
const vuMeterConfig: Partial<VuMeterConfig> = {
  theme: VuMeterTheme.DEFAULT,
  orientation: VuMeterOrientation.VERTICAL,
  scale: VuMeterScale.DEFAULT,
  channels: 6,
  rangeMinDb: -60,
  scaleStepDb: 10,
  scaleOffsetDb: 0,
  levelHoldDuration: 0,
  style: {
    levelBackground: 'rgba(0,0,0,0)', // transparent
    levelColors: [
      {maxValueDb: -40, color: '#F3C6B3', holdColor: '#F3C6B3'},
      {maxValueDb: -30, color: '#E2BDB2', holdColor: '#E2BDB2'},
      {maxValueDb: -24, color: '#D5B5B2', holdColor: '#D5B5B2'},
      {maxValueDb: -13, color: '#C2AAB1', holdColor: '#C2AAB1'},
      {maxValueDb: -4, color: '#A499B1', holdColor: '#A499B1'},
      {maxValueDb: -1, color: '#8D8BB0', holdColor: '#8D8BB0'},
      {maxValueDb: 0, color: '#747DAF', holdColor: '#747DAF'},
    ],
  },
};

@Component({
  selector: 'app-vu-meter',
  imports: [KnobWrapperComponent],
  host: {'class': 'audio-track-visualization'},
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="vu-meter-container">
      <div class="vu-meter-container-inner" #vuMeter></div>
      <div class="label">{{ audioHandlerBundle().label }}</div>
    </div>
    <div class="audio-knobs">
      <div class="audio-knob-container">
        <app-knob-wrapper [min]="0" [max]="1" [value]="volume()" (valueChange)="changeGain($event)"></app-knob-wrapper>
      </div>
      <div class="audio-knobs-divider"></div>
      @if (isInitial()) {
        <div class="audio-knobs-label">GAIN</div>
      }
    </div>
  `,
})
export class VuMeterComponent implements AfterViewInit, OnDestroy {
  public playerService = inject(PlayerService);
  public sidecarAudioService = inject(SidecarAudioService);
  public audioHandlerBundle = input.required<AudioHandlerBundle>();
  public isInitial = input<boolean>(false);
  public volume = signal<number>(1);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);

  @ViewChild('vuMeter') vuMeterElementRef!: ElementRef;

  private _vuMeter?: VuMeter;
  private _source?: PeakProcessorAudioLevelSource;
  private _id = crypto.randomUUID();

  private tryCreateVuMeter() {
    this.destroyVuMeter();
    this.vuMeterElementRef.nativeElement.innerHTML = '';

    const handler = this.audioHandlerBundle().audioHandler;
    this._source = new PeakProcessorAudioLevelSource();
    this._source.setHandler(handler);

    this._vuMeter = new VuMeter({
      source: this._source,
      config: {...vuMeterConfig, htmlElement: this.vuMeterElementRef.nativeElement},
    });
  }

  private destroyVuMeter() {
    this._vuMeter?.destroy();
    this._source?.destroy();
    this._vuMeter = undefined;
    this._source = undefined;
  }

  ngAfterViewInit(): void {
    toObservable(this.audioHandlerBundle, {injector: this.injector})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged((a, b) => a.audioHandler === b.audioHandler),
        switchMap((bundle) => {
          this.volume.set(bundle.audioHandler.volume);
          this.tryCreateVuMeter();
          return bundle.audioHandler.onEvent$.pipe(filter((e) => e.type === AudioHandlerEventType.AUDIO_HANDLER_CHANGE));
        })
      )
      .subscribe((e) => this.volume.set(e.data.state.volume));
  }

  ngOnDestroy(): void {
    this.destroyVuMeter();
  }

  changeGain(gain: number) {
    this.audioHandlerBundle().audioHandler.setVolume(gain);
  }
}
