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

import {Component, computed, HostListener, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {FlyOutService} from '../fly-out.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {allowedNameValidator} from '../../../common/validators/allowed-name-validator';
import {SidecarTextService} from './text-sidecar.service';
import {NgbTooltip} from '@ng-bootstrap/ng-bootstrap';
import {SidecarDisplay} from '../common/sidecar-display.component';
import {FileFormat, PlayerTextHandlerType} from '@byomakase/omakase-player';
import {PlayerService} from '../../player/player.service';
import {numberValidator} from '../../../common/validators/number-validator';

const urlRegex = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

@Component({
  selector: 'app-add-sidecar-text-fly-out',
  template: `
    <div class="header">
      <span>TEXT SIDECARS</span>
      <i appIcon="close" (click)="close()"> </i>
    </div>
    <div class="body add-sidecar-body">
      <div class="sidecar-container">
        @for (sidecarText of sidecarTextService.sidecarTexts(); track sidecarText) {
          <app-sidecar-display
            [isDeletable]="sidecarText.id != undefined"
            [url]="sidecarText.src"
            [label]="sidecarText.id && sidecarTextService.noUserLabelSidecarTextIds().includes(sidecarText.id) ? '' : sidecarText.label"
            (deleted)="sidecarTextService.removeSidecarText(sidecarText)"
          >
          </app-sidecar-display>
        }
      </div>

      <form [formGroup]="form">
        <div class="add-sidecar-dialogue">
          <div class="input-tooltip">
            <input (blur)="onUrlInputUnfocus()" formControlName="url" type="text" placeholder="URL" />
            <i appIcon="question" ngbTooltip="Specify the URL of a sidecar. The following formats are supported: VTT, SRT, IMSC, SCC" placement="top"></i>
          </div>
          <input formControlName="label" type="text" placeholder="Label" />
          <div class="input-tooltip">
            <input formControlName="slew" type="text" placeholder="Slew" [class.invalid]="!isSlewValid()" />
            <i appIcon="question" ngbTooltip="Specify cue translation in +/- seconds" placement="top"></i>
          </div>
          <div class="input-wrapper">
            <select formControlName="engine">
              @for (engineOption of filteredEngineOptions; track engineOption.value) {
                <option [ngValue]="engineOption.value">{{ engineOption.label }}</option>
              }
            </select>
          </div>
          <div class="button-wrapper">
            <button [disabled]="isAddDisabled()" (click)="addSidecarText()">ADD</button>
          </div>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, IconDirective, NgbTooltip, SidecarDisplay],
})
export class AddSidecarTextFlyOut {
  form = new FormGroup({
    label: new FormControl(''),
    url: new FormControl('', [allowedNameValidator(urlRegex)]),
    engine: new FormControl<PlayerTextHandlerType>(PlayerTextHandlerType.MEDIA_CAPTIONS),
    slew: new FormControl('', [numberValidator(undefined, undefined, true)]),
  });

  public engineOptions = [
    {label: 'Media Captions', value: PlayerTextHandlerType.MEDIA_CAPTIONS},
    {label: 'Native', value: PlayerTextHandlerType.NATIVE},
    {label: 'IMSC', value: PlayerTextHandlerType.IMSC},
  ];

  public vttFamilyEngineOptions = [
    {label: 'Media Captions', value: PlayerTextHandlerType.MEDIA_CAPTIONS},
    {label: 'Native', value: PlayerTextHandlerType.NATIVE},
  ];

  public mcFamilyEngineOptions = [{label: 'Media Captions', value: PlayerTextHandlerType.MEDIA_CAPTIONS}];

  public imscFamilyEngineOptions = [{label: 'IMSC', value: PlayerTextHandlerType.IMSC}];

  public filteredEngineOptions = this.engineOptions;
  private flyOutService = inject(FlyOutService);
  public sidecarTextService = inject(SidecarTextService);
  private playerService = inject(PlayerService);
  private fileFormat = signal<FileFormat | undefined>(undefined);

  public isAddDisabled = computed(() => {
    return !(this.isUrlProbed() && this.isUrlValid() && this.isSlewValid());
  });

  public isUrlValid = signal(false);
  public isUrlProbed = signal(false);
  public isSlewValid = signal(true);

  constructor() {
    this.form.controls.url.valueChanges.subscribe(() => {
      this.isUrlValid.set(this.form.controls.url.errors == null);
    });
    this.form.controls.slew.valueChanges.subscribe(() => {
      this.isSlewValid.set(this.form.controls.slew.errors == null);
    });
  }

  close() {
    this.flyOutService.close();
  }

  addSidecarText() {
    this.sidecarTextService.addSidecarText({
      src: this.form.value.url!,
      label: this.form.value.label ?? '',
      engine: this.form.value.engine ?? PlayerTextHandlerType.MEDIA_CAPTIONS,
      slew: this.form.value.slew ? parseFloat(this.form.value.slew) : undefined,
      probedFileFormat: this.fileFormat(),
    });

    this.form.reset();
    this.form.controls.engine.setValue(PlayerTextHandlerType.MEDIA_CAPTIONS);
    this.form.controls.slew.setValue('');
    this.filteredEngineOptions = this.engineOptions;
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: Event) {
    event.preventDefault();

    if (!this.isAddDisabled()) {
      this.addSidecarText();
    }
  }

  onUrlInputFocus() {
    this.isUrlProbed.set(false);
  }

  onUrlInputUnfocus() {
    if (!this.isUrlValid()) {
      this.filteredEngineOptions = this.engineOptions;
      this.form.controls.engine.setValue(PlayerTextHandlerType.MEDIA_CAPTIONS);
      this.fileFormat.set(undefined);

      return;
    }
    this.playerService.omakasePlayer!.tools.probe(this.form.controls.url.value ?? '').subscribe((mediaProbeResult) => {
      if (mediaProbeResult?.fileFormat && [FileFormat.TTML, FileFormat.SCC].includes(mediaProbeResult.fileFormat)) {
        if (this.filteredEngineOptions !== this.imscFamilyEngineOptions) {
          this.filteredEngineOptions = this.imscFamilyEngineOptions;
          this.form.controls.engine.setValue(PlayerTextHandlerType.IMSC);
        }
      } else if (mediaProbeResult?.fileFormat && [FileFormat.VTT].includes(mediaProbeResult.fileFormat)) {
        if (this.filteredEngineOptions !== this.vttFamilyEngineOptions) {
          this.filteredEngineOptions = this.vttFamilyEngineOptions;
          this.form.controls.engine.setValue(PlayerTextHandlerType.MEDIA_CAPTIONS);
        }
      } else if (mediaProbeResult?.fileFormat && [FileFormat.SRT, FileFormat.ASS].includes(mediaProbeResult.fileFormat)) {
        if (this.filteredEngineOptions !== this.mcFamilyEngineOptions) {
          this.filteredEngineOptions = this.mcFamilyEngineOptions;
          this.form.controls.engine.setValue(PlayerTextHandlerType.MEDIA_CAPTIONS);
        }
      } else {
        this.filteredEngineOptions = this.engineOptions;
        this.form.controls.engine.setValue(PlayerTextHandlerType.MEDIA_CAPTIONS);
      }
      this.fileFormat.set(mediaProbeResult?.fileFormat);
      this.isUrlProbed.set(true);
    });
  }
}
