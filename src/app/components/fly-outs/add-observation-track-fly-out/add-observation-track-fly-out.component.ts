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

import {Component, HostListener, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {FlyOutService} from '../fly-out.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {allowedNameValidator} from '../../../common/validators/allowed-name-validator';
import {NgbTooltip} from '@ng-bootstrap/ng-bootstrap';
import {ColorPickerComponent} from '../../../common/controls/color-picker/color-picker.component';
import {CheckboxComponent} from '../../../common/controls/checkbox/checkbox.component';
import {ColorSquareComponent} from '../../../common/controls/color-picker/multicolor-square.component';
import {MarkerTrackDisplay} from '../add-markers-fly-out/marker-track-dispaly.component';
import {MarkerTrack, MarkerTrackService} from '../add-markers-fly-out/marker-track.service';
import {ObservationTrack, ObservationTrackService, ObservationTrackVisualization} from './observation-track.service';
import {ObservationTrackDisplay} from './observation-track-display.component';
import {ColorService} from '../../../common/services/color.service';
import {ColorResolver} from '../../../common/util/color-util';
import {combineLatest, merge} from 'rxjs';
import {Constants} from '../../../constants/constants';

const urlRegex = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

@Component({
  selector: 'app-add-observation-track-fly-out',
  template: `
    <div class="header">
      <span>OBSERVATION TRACKS</span>
      <i appIcon="close" (click)="close()"> </i>
    </div>
    <div class="body add-observation-track-body">
      @for (observationTrack of observationTrackService.observationTracks(); track observationTrack) {
      <app-observation-track-display [observationTrack]="observationTrack" (deleted)="deleteObservationTrack(observationTrack)" />
      }

      <div class="add-observation-track-dialogue">
        <form [formGroup]="form">
          <div class="input-tooltip">
            <input formControlName="url" type="text" placeholder="URL" />
            <i appIcon="question" ngbTooltip="Specify the URL of a sidecar. The following formats are supported: VTT" placement="top"></i>
          </div>
          <input formControlName="label" type="text" placeholder="Label" />
          <div class="input-wrapper">
            <select formControlName="visualization">
              <option [value]="''" disabled>Visualization</option>
              @for (visualizationEntry of visualizationOptions.entries(); track visualizationEntry[0]) {
              <option [value]="visualizationEntry[0]">{{ visualizationEntry[1] }}</option>
              }
            </select>
          </div>

          <input formControlName="minValue" class="short" type="text" placeholder="Y-Axis Min" />

          <br />
          <input formControlName="maxValue" class="short" type="text" placeholder="Y-Axis Max" />
          <div class="input-wrapper color-picker-wrapper input-wrapper-no-margin">
            <div class="color-display" [style]="{backgroundColor: form.controls.color.value}" (click)="isColorPickerOpen.set(true)"></div>

            <label class="input-label">Color</label>
          </div>
          @if (isColorPickerOpen()) {
          <div class="color-picker-wrapper">
            <app-color-picker
              #colorPicker
              [colors]="observationTrackService.COLORS"
              [activeColor]="form.controls.color.value!"
              (clickOutside)="closeColorPicker()"
              (selectedColor)="setColor($event)"
            />
          </div>
          }
          <div class="button-wrapper">
            <button [disabled]="isAddDisabled()" (click)="addObservationTrack()">ADD</button>
          </div>
        </form>
      </div>
    </div>
  `,
  imports: [ReactiveFormsModule, IconDirective, NgbTooltip, ColorPickerComponent, ObservationTrackDisplay],
})
export class AddObservationTrackFlyOut {
  form = new FormGroup({
    label: new FormControl<string>(''),
    url: new FormControl<string>('', [allowedNameValidator(urlRegex)]),
    visualization: new FormControl<ObservationTrackVisualization | ''>(''),
    color: new FormControl<string>(''),
    minValue: new FormControl<string>(''),
    maxValue: new FormControl<string>(''),
  });

  private flyOutService = inject(FlyOutService);
  private colorService = inject(ColorService);
  private colorResolver: ColorResolver;
  public observationTrackService = inject(ObservationTrackService);
  public visualizationOptions: Map<ObservationTrackVisualization, string> = new Map([
    ['bar-chart', 'Bar Chart'],
    ['line-chart', 'Line Chart'],
    ['led-chart', 'LED Chart'],
  ]);

  public isAddDisabled = signal(true);
  public isColorPickerOpen = signal(false);

  closeColorPicker() {
    this.isColorPickerOpen.set(false);
  }

  setColor(color: string) {
    this.form.controls.color.setValue(color);
  }

  constructor() {
    const url$ = this.form.controls.url.valueChanges;
    const visualization$ = this.form.controls.visualization.valueChanges;

    combineLatest([url$, visualization$]).subscribe(() => {
      this.isAddDisabled.set(this.shouldDisable());
    });

    this.colorResolver = this.colorService.createColorResolver(Constants.COLOR_RESOLVER_IDS.observationTrack, this.observationTrackService.COLORS);
    this.form.controls.color.setValue(this.colorResolver.getColor());
  }

  private shouldDisable(): boolean {
    const urlControl = this.form.controls.url;
    const visualizationControl = this.form.controls.visualization;

    console.log(urlControl.value, visualizationControl.value);

    const hasUrlErrors = urlControl.errors != null;
    const visualizationEmpty = visualizationControl.value === '' || visualizationControl.value === null;

    return hasUrlErrors || visualizationEmpty;
  }

  close() {
    this.flyOutService.close();
  }

  /**
   * Adds a marker track and resets the form
   */
  addObservationTrack() {
    const label = this.form.value.label === null || this.form.value.label === '' ? undefined : this.form.value.label;
    let minValue = Number.parseFloat(this.form.value.minValue ?? '');
    let maxValue = Number.parseFloat(this.form.value.maxValue ?? '');
    this.observationTrackService.addObservationTrack({
      id: crypto.randomUUID(),
      src: this.form.value.url!,
      label: label,
      color: this.form.value.color!,
      visualization: this.form.value.visualization as ObservationTrackVisualization,
      minValue: Number.isNaN(minValue) ? undefined : minValue,
      maxValue: Number.isNaN(maxValue) ? undefined : maxValue,
    });

    this.colorResolver.incrementColorUsage(this.form.value.color!);
    this.form.reset();
    this.form.controls.color.setValue(this.colorResolver.getColor());
    this.form.controls.visualization.setValue('');
  }

  deleteObservationTrack(observationTrack: ObservationTrack) {
    this.observationTrackService.removeObservationTrack(observationTrack);
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: KeyboardEvent) {
    event.preventDefault();

    if (!this.isAddDisabled()) {
      this.addObservationTrack();
    }
  }
}
