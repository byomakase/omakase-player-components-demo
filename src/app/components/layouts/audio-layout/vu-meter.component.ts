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

import {AfterViewInit, Component, ElementRef, inject, input, OnDestroy, signal, ViewChild} from '@angular/core';
import {PlayerService} from '../../player/player.service';
import {PeakMeterConfig, VuMeter, VuMeterApi} from '@byomakase/vu-meter';
import {PeakProcessorWithMetadata} from './audio-layout.component';
import {SidecarAudioService} from '../../fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {KnobWrapperComponent} from '../../../common/controls/knob/knob.component';

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
      <div class="label">{{ peakProcessorWithMetadata().label }}</div>
    </div>
    <div class="audio-knobs">
      <div class="audio-knob-container">
        <app-knob-wrapper [min]="0" [max]="1" [value]="volume()" (valueChange)="changeGain($event)"></app-knob-wrapper>
      </div>
      <div class="audio-knobs-divider"></div>
      @if( isInitial()) {
      <div class="audio-knobs-label">GAIN</div>
      }
    </div>
  `,
})
export class VuMeterComponent implements AfterViewInit, OnDestroy {
  public playerService = inject(PlayerService);
  public sidecarAudioService = inject(SidecarAudioService);
  public peakProcessorWithMetadata = input.required<PeakProcessorWithMetadata>();
  public isInitial = input<boolean>(false);
  public volume = signal<number>(1);

  @ViewChild('vuMeter') vuMeterElementRef!: ElementRef;

  private _vuMeter?: VuMeterApi;

  constructor() {}

  private tryCreateVuMeter() {
    let channelCount = 6;

    this.vuMeterElementRef.nativeElement.innerHTML = '';

    this._vuMeter = new VuMeter(channelCount, this.vuMeterElementRef.nativeElement, peakMeterConfig).attachSource(this.peakProcessorWithMetadata().peakProcessor);
  }

  ngAfterViewInit(): void {
    this.volume.set(this.getGain());

    this.tryCreateVuMeter();
  }

  ngOnDestroy(): void {}

  changeGain(gain: number) {
    if (
      this.playerService.omakasePlayer?.audio
        .getActiveSidecarAudioTracks()
        .map((track) => track.id)
        .includes(this.peakProcessorWithMetadata().id)
    ) {
      //   this.playerService.omakasePlayer!.audio.setSidecarAudioEffectsParams(this.peakProcessorWithMetadata().id, new OmpAudioEffectGainParam(gain), {type: 'gain'});
      this.playerService.omakasePlayer!.audio.setSidecarVolume(gain, [this.peakProcessorWithMetadata().id]);
    } else {
      //   this.playerService.omakasePlayer!.audio.setMainAudioEffectsParams(new OmpAudioEffectGainParam(gain), {type: 'gain'});
      this.playerService.omakasePlayer!.video.setVolume(gain);
    }
  }

  getGain() {
    if (
      this.playerService.omakasePlayer?.audio
        .getActiveSidecarAudioTracks()
        .map((track) => track.id)
        .includes(this.peakProcessorWithMetadata().id)
    ) {
      //   this.playerService.omakasePlayer!.audio.setSidecarAudioEffectsParams(this.peakProcessorWithMetadata().id, new OmpAudioEffectGainParam(gain), {type: 'gain'});
      return this.playerService.omakasePlayer!.audio.getSidecarAudio(this.peakProcessorWithMetadata().id)!.getVolume();
    } else {
      //   this.playerService.omakasePlayer!.audio.setMainAudioEffectsParams(new OmpAudioEffectGainParam(gain), {type: 'gain'});
      return this.playerService.omakasePlayer!.video.getVolume();
    }
  }
}
