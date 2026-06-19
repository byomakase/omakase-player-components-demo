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

import {AfterViewInit, Component, DestroyRef, ElementRef, inject, Injector, input, signal, ViewChild} from '@angular/core';
import {takeUntilDestroyed, toObservable} from '@angular/core/rxjs-interop';
import {PlayerService} from '../../player/player.service';
import {AudioPeakProcessorMessageEvent, PeakMeterConfig, VuMeter, VuMeterApi} from '@byomakase/vu-meter';
import {AudioHandlerBundle} from './audio-layout.component';
import {SidecarAudioService} from '../../fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {KnobWrapperComponent} from '../../../common/controls/knob/knob.component';
import {AudioHandlerEventType, AudioPeakProcessorEventType} from '@byomakase/omakase-player';
import {filter, map, of, switchMap} from 'rxjs';

const peakMeterConfig: Partial<PeakMeterConfig> = {
  vertical: true,
  maskTransition: '0.1s',
  peakHoldDuration: 0,
  dbTickSize: 10,
  borderSize: 7,
  fontSize: 12,
  dbRangeMin: -60,
  dbRangeMax: 0,

  backgroundColor: 'rgba(0,0,0,0)', // transparent
  tickColor: '#70849A',
  labelColor: '#70849A',
  gradient: ['#F3C6B3 0%', '#E2BDB2 33%', '#D5B5B2 50%', '#C2AAB1 59%', '#A499B1 78%', '#8D8BB0 93%', '#747DAF 100%'],
};

@Component({
  selector: 'app-vu-meter',
  imports: [KnobWrapperComponent],
  host: {'class': 'audio-track-visualization'},
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
export class VuMeterComponent implements AfterViewInit {
  public playerService = inject(PlayerService);
  public sidecarAudioService = inject(SidecarAudioService);
  public audioHandlerBundle = input.required<AudioHandlerBundle>();
  public isInitial = input<boolean>(false);
  public volume = signal<number>(1);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);

  @ViewChild('vuMeter') vuMeterElementRef!: ElementRef;

  private _vuMeter?: VuMeterApi;

  private tryCreateVuMeter() {
    const channelCount = 6;
    this.vuMeterElementRef.nativeElement.innerHTML = '';

    const handler = this.audioHandlerBundle().audioHandler;
    const source = of(
      handler.onPeakProcessorEvent$.pipe(
        filter((e) => e.type === AudioPeakProcessorEventType.AUDIO_PEAK_PROCESSOR_MESSAGE),
        map((e) => ({data: e.data}) as unknown as AudioPeakProcessorMessageEvent)
      )
    );

    this._vuMeter = new VuMeter(channelCount, this.vuMeterElementRef.nativeElement, peakMeterConfig).attachSource(source);
  }

  ngAfterViewInit(): void {
    toObservable(this.audioHandlerBundle, {injector: this.injector})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((bundle) => {
          this.volume.set(bundle.audioHandler.volume);
          this.tryCreateVuMeter();
          return bundle.audioHandler.onEvent$.pipe(
            filter((e) => e.type === AudioHandlerEventType.AUDIO_HANDLER_CHANGE)
          );
        })
      )
      .subscribe((e) => this.volume.set(e.data.state.volume));
  }

  changeGain(gain: number) {
    this.audioHandlerBundle().audioHandler.setVolume(gain);
  }
}
