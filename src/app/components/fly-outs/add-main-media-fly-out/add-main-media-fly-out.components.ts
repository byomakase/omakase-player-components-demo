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

import {Component, HostListener, inject, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {FlyOutService} from '../fly-out.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {allowedNameValidator} from '../../../common/validators/allowed-name-validator';
import {VideoLoadOptions} from '@byomakase/omakase-player';
import {ToastService} from '../../../common/toast/toast.service';
import {PlayerService} from '../../player/player.service';
import {SidecarTextService} from '../add-sidecar-text-fly-out/text-sidecar.service';
import {NgbTooltip} from '@ng-bootstrap/ng-bootstrap';
import {timecodeValidator} from '../../../common/validators/timecode-validator';
import {filter, take} from 'rxjs';
import {LayoutService} from '../../layout-menu/layout.service';
import {SidecarAudioService} from '../add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {CheckboxComponent} from '../../../common/controls/checkbox/checkbox.component';

const nonFractionFrameRates = ['24', '25', '50', '60', '23.98'];
const urlRegex = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

/**
 * A component used to load main media into an OPCD session. It leverages innate Omakase player ability to autodetect frame rate and
 * default drop frame resolution leaving the most form inputs optional.
 */
@Component({
  selector: 'app-add-main-media-fly-out',
  template: `
    <div class="header">
      <span>Main Media</span>
      <i appIcon="close" (click)="close()"> </i>
    </div>
    <div class="body main-media-body">
      <form [formGroup]="form">
        <div class="input-wrapper">
          <div class="input-tooltip">
            <input formControlName="url" type="text" placeholder="URL" />
            <i appIcon="question" ngbTooltip="Specify the URL of an M3U8 or Progressive MP4" placement="top"></i>
          </div>
          @if(form.controls.url.hasError('forbiddenName') && form.controls.url.value !== '') {}
        </div>

        <div class="input-wrapper">
          <select formControlName="frameRate">
            <option value="" disabled selected>Frame Rate</option>
            @for (frameRate of frameRates; track frameRate) {
            <option [value]="frameRate">{{ frameRate }}</option>
            }
          </select>
          fps
        </div>

        <div class="input-wrapper">
          <select formControlName="dropFrame">
            @for (dropFrameOption of dropFrameOptions; track dropFrameOption.value) {
            <option [ngValue]="dropFrameOption.value" [disabled]="dropFrameOption.value === null">
              {{ dropFrameOption.label }}
            </option>
            }
          </select>
        </div>

        <div class="input-wrapper">
          <input formControlName="ffom" (click)="displayInitialTimecode()" class="short" type="text" placeholder="FFOM" />
          @if (form.controls.ffom.hasError('forbiddenName')) { <span class="error-message">Invalid timecode format</span> }
        </div>

        @if(sidecarAudioService.sidecarAudios().length || sidecarTextService.sidecarTexts().length) {
        <div class="input-wrapper input-wrapper-no-margin">
          <input hidden formControlName="removeAllSidecars" type="checkbox" />
          <app-checkbox [checked]="form.controls.removeAllSidecars.value ?? undefined" (clicked)="toggleRemoveAllSidecars()" />
          <label class="input-label">Remove all sidecars</label>
        </div>
        }

        <div class="button-wrapper">
          <button [disabled]="isLoadDisabled()" (click)="load()">LOAD VIDEO</button>
          <button class="cancel-button" (click)="close()">CANCEL</button>
        </div>
      </form>
    </div>
  `,
  imports: [ReactiveFormsModule, IconDirective, NgbTooltip, CheckboxComponent],
})
export class AddMainMediaFlyOut implements OnInit {
  form = new FormGroup({
    url: new FormControl<string>('', [allowedNameValidator(urlRegex)]),
    frameRate: new FormControl<string>(''),
    dropFrame: new FormControl<boolean | null>(null),
    removeAllSidecars: new FormControl<boolean>(true),
    ffom: new FormControl<string>('', [timecodeValidator(undefined, false)]),
  });

  isLoadDisabled = signal(true);

  private flyOutService = inject(FlyOutService);
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);
  private layoutService = inject(LayoutService);
  public sidecarAudioService = inject(SidecarAudioService);
  public sidecarTextService = inject(SidecarTextService);

  public frameRates = ['24', '25', '50', '60', '23.98', '29.97', '59.94'];
  public dropFrameOptions = [
    {value: null, label: 'Drop Frame Timing'},
    {value: false, label: 'NDF'},
    {value: true, label: 'DF'},
  ];

  constructor() {}

  ngOnInit(): void {
    this.form.controls.url.valueChanges.subscribe(() => {
      this.resolveIsLoadDisabled();
    });

    this.form.controls.frameRate.valueChanges.subscribe((frameRate) => {
      this.form.controls.dropFrame.reset();
      if (frameRate && nonFractionFrameRates.includes(frameRate)) {
        this.form.controls.dropFrame.disable();
      } else {
        this.form.controls.dropFrame.enable();
      }

      const frameRateParsed = frameRate != null ? Number.parseFloat(frameRate) : undefined;
      this.form.controls.ffom.setValidators([timecodeValidator(frameRateParsed, this.form.controls.dropFrame.value ?? false)]);
      this.form.controls.ffom.updateValueAndValidity();
      this.resolveIsLoadDisabled();
    });

    this.form.controls.dropFrame.valueChanges.subscribe((dropFrame) => {
      if (this.form.controls.ffom.value !== '') {
        this.reformatTimecode(dropFrame ?? false);
      }
      let frameRate = this.form.controls.frameRate.value != null ? Number.parseFloat(this.form.controls.frameRate.value) : undefined;
      this.form.controls.ffom.setValidators([timecodeValidator(frameRate, this.form.controls.dropFrame.value ?? false)]);
      this.form.controls.ffom.updateValueAndValidity();
      this.resolveIsLoadDisabled();
    });

    this.form.controls.ffom.valueChanges.subscribe(() => {
      this.resolveIsLoadDisabled();
    });
  }

  close() {
    this.flyOutService.close();
  }

  toggleRemoveAllSidecars() {
    this.form.controls.removeAllSidecars.setValue(!this.form.controls.removeAllSidecars.value);
  }

  load() {
    const url = this.form.controls.url.value!;
    const frameRate = Number.parseFloat(this.form.controls.frameRate.value!);
    const dropFrame = this.form.controls.dropFrame.value;
    const ffom = this.form.controls.ffom.value;

    const videoLoadOptions: VideoLoadOptions = {};
    if (dropFrame !== null) {
      videoLoadOptions.dropFrame = dropFrame;
    }
    videoLoadOptions.frameRate = frameRate;

    if (ffom && ffom !== '') {
      videoLoadOptions.ffom = ffom;
    }

    const sidecarAudios = this.sidecarAudioService.sidecarAudios();
    const sidecarAudioTracks = this.playerService.omakasePlayer?.audio.getSidecarAudioTracks() ?? [];
    const sidecarTexts = this.sidecarTextService.sidecarTexts();

    if (this.playerService.omakasePlayer === undefined) {
      const config = this.layoutService.playerConfiguration;
      this.playerService.create(config);
    }

    this.playerService.omakasePlayer!.loadVideo(url, videoLoadOptions).subscribe({
      next: () => {
        this.toastService.show({message: 'Media successfully loaded', type: 'success', duration: 5000});
        this.playerService.omakasePlayer!.video.unmute();

        if (this.form.controls.removeAllSidecars.value === false) {
          this.sidecarAudioService.reloadSidecarAudios(sidecarAudios, sidecarAudioTracks);

          this.playerService
            .omakasePlayer!.subtitles.onSubtitlesLoaded$.pipe(
              filter((p) => !!p),
              take(1)
            )
            .subscribe((event) => {
              this.sidecarTextService.reloadAllSidecarTexts(sidecarTexts);
            });
        } else {
          this.sidecarAudioService.removeAllSidecarAudios();
          this.sidecarTextService.removeAllSidecarTexts();
        }
      },
      error: () => this.toastService.show({message: 'Media load failed', type: 'error', duration: 5000}),
    });

    this.close();
  }

  displayInitialTimecode() {
    if (this.form.controls.ffom.value === '') {
      if (this.form.controls.dropFrame.value) {
        this.form.controls.ffom.setValue('00:00:00;00');
      } else {
        this.form.controls.ffom.setValue('00:00:00:00');
      }
    }
  }

  reformatTimecode(isDropFrame: boolean) {
    const value = this.form.controls.ffom.value!;
    if (isDropFrame && this.form.controls.ffom.valid) {
      this.form.controls.ffom.setValue(value.slice(0, -3) + ';' + value.slice(-2));
    } else if (this.form.controls.ffom.valid) {
      this.form.controls.ffom.setValue(value.slice(0, -3) + ':' + value.slice(-2));
    }
  }

  private resolveIsLoadDisabled() {
    const isUrlInvalid = this.form.controls.url.invalid || this.form.controls.url.value === '';
    const isFfomInvalid = this.form.controls.ffom.invalid;
    this.isLoadDisabled.set(isUrlInvalid || isFfomInvalid);
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: KeyboardEvent) {
    event.preventDefault();

    if (!this.isLoadDisabled()) {
      this.load();
    }
  }
}
