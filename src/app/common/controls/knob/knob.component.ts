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

import {Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, AfterViewInit, OnChanges, OnDestroy, SimpleChanges, input, output} from '@angular/core';

/**
 * Simple wrapper around knob Web component. It should always be used in place of raw web component
 * for transparent integration with the whole angular application as it handles all possible input changes
 * transparently with respect to component updates
 */
@Component({
  selector: 'app-knob-wrapper',
  template: `
    <knob-control
      #knob
      [attr.max-tick-count]="maxTickCount()"
      [attr.min]="min()"
      [attr.radius]="40"
      [attr.max]="max()"
      [attr.min-angle]="minAngle()"
      [attr.max-angle]="maxAngle()"
      [attr.value]="value()"
      [attr.rotation-speed]="rotationSpeed()"
    >
    </knob-control>
  `,
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class KnobWrapperComponent implements AfterViewInit, OnChanges, OnDestroy {
  value = input.required<number>();
  min = input<number>(0);
  max = input<number>(1);
  minAngle = input<number>(-135);
  maxAngle = input<number>(135);
  maxTickCount = input<number>(20);
  radius = input<number>(40);
  rotationSpeed = input<number>(2);

  valueChange = output<number>();

  @ViewChild('knob', {static: true}) knobRef!: ElementRef;

  private get knob(): any {
    return this.knobRef?.nativeElement;
  }

  private onInput = (event: CustomEvent) => {
    this.valueChange.emit(event.detail);
  };

  ngAfterViewInit() {
    if (!this.knob) return;

    this.knob.addEventListener('input', this.onInput as EventListener);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.knob) return;

    if (changes['min'] && this.min !== undefined) {
      this.knob.setAttribute('min', this.min.toString());
    }
    if (changes['max'] && this.max !== undefined) {
      this.knob.setAttribute('max', this.max.toString());
    }
    if (changes['minAngle'] && this.minAngle !== undefined) {
      this.knob.setAttribute('min-angle', this.minAngle.toString());
    }
    if (changes['maxAngle'] && this.maxAngle !== undefined) {
      this.knob.setAttribute('max-angle', this.maxAngle.toString());
    }
    if (changes['value'] && this.value !== undefined) {
      this.knob.value = this.value;
    }
  }

  ngOnDestroy() {
    if (this.knob) {
      this.knob.removeEventListener('input', this.onInput as EventListener);
    }
  }
}
