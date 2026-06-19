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

import {Component, computed, effect, ElementRef, inject, input, output, signal, viewChild} from '@angular/core';
import {AbstractControl, FormControl, ReactiveFormsModule, ValidatorFn, Validators} from '@angular/forms';
import {MediaTemporalFormat, SpanTemporal, TextCue, TextTrack, TimedItemTemporalType} from '@byomakase/omakase-player';
import {PlayerService} from '../../components/player/player.service';

@Component({
  selector: 'app-text-cue-view',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="text-cue-view">
      <div class="time-display" (dblclick)="startEdit('start', $event)">
        @if (editingField() === 'start') {
          <input
            #startEditor
            [formControl]="startControl"
            [style.color]="startControl.invalid && startControl.dirty ? 'red' : ''"
            (blur)="cancelEdit()"
            (keydown.enter)="saveEdit()"
          />
        } @else {
          {{ startTimecode() }}
        }
      </div>

      <div class="text-display" (dblclick)="startEdit('text', $event)">
        @if (editingField() === 'text') {
          <textarea #textEditor [value]="textEditValue()" (input)="textEditValue.set($any($event.target).value)" (blur)="cancelEdit()" (keydown.enter)="onTextareaEnter($event)"> </textarea>
        } @else {
          {{ localText() }}
        }
      </div>

      <div class="time-display" (dblclick)="startEdit('end', $event)">
        @if (editingField() === 'end') {
          <input
            #endEditor
            [formControl]="endControl"
            [style.color]="endControl.invalid && endControl.dirty ? 'red' : ''"
            (blur)="cancelEdit()"
            (keydown.enter)="saveEdit()"
          />
        } @else {
          {{ endTimecode() }}
        }
      </div>
    </div>
  `,
})
export class TextCueView {
  public textCue = input.required<TextCue>();
  public textTrack = input.required<TextTrack>();
  public edited = output<void>();

  private playerService = inject(PlayerService);

  editingField = signal<'start' | 'text' | 'end' | null>(null);
  textEditValue = signal<string>('');

  private startSeconds = signal<string>('');
  private endSeconds = signal<string>('');
  localText = signal<string>('');

  startControl = new FormControl('', {nonNullable: true});
  endControl = new FormControl('', {nonNullable: true});

  startTimecode = computed(() =>
    this.playerService.omakasePlayer!.player.convertTime(Number(this.startSeconds()), MediaTemporalFormat.SECONDS, MediaTemporalFormat.TIMECODE)
  );

  endTimecode = computed(() =>
    this.playerService.omakasePlayer!.player.convertTime(Number(this.endSeconds()), MediaTemporalFormat.SECONDS, MediaTemporalFormat.TIMECODE)
  );

  startEditor = viewChild<ElementRef<HTMLInputElement>>('startEditor');
  textEditor = viewChild<ElementRef<HTMLTextAreaElement>>('textEditor');
  endEditor = viewChild<ElementRef<HTMLInputElement>>('endEditor');

  constructor() {
    effect(() => {
      const cue = this.textCue();
      this.localText.set(cue.text);
      if (cue.temporal.type === TimedItemTemporalType.SPAN) {
        const span = cue.temporal as SpanTemporal;
        this.startSeconds.set(span.start);
        this.endSeconds.set(span.end);
      }
    });

    effect(() => {
      const field = this.editingField();
      if (field === 'start') {
        const el = this.startEditor()?.nativeElement;
        if (el) { el.focus(); el.select(); }
      }
      if (field === 'text') {
        const el = this.textEditor()?.nativeElement;
        if (el) { el.focus(); el.select(); }
      }
      if (field === 'end') {
        const el = this.endEditor()?.nativeElement;
        if (el) { el.focus(); el.select(); }
      }
    });
  }

  startEdit(field: 'start' | 'text' | 'end', event: Event) {
    event.stopPropagation();
    this.editingField.set(field);

    if (field === 'start') {
      this.startControl.setValidators([Validators.required, this.createStartValidator()]);
      this.startControl.setValue(this.startTimecode());
      this.startControl.markAsPristine();
    }
    if (field === 'text') {
      this.textEditValue.set(this.localText());
    }
    if (field === 'end') {
      this.endControl.setValidators([Validators.required, this.createEndValidator()]);
      this.endControl.setValue(this.endTimecode());
      this.endControl.markAsPristine();
    }
  }

  saveEdit() {
    const field = this.editingField();
    const textCue = this.textCue();
    if (!field) return;

    if (field === 'text') {
      this.textTrack().updateTimedItem(textCue.id, {text: this.textEditValue()});
      this.localText.set(this.textEditValue());
    } else if (textCue.temporal.type === TimedItemTemporalType.SPAN) {
      const control = field === 'start' ? this.startControl : this.endControl;
      control.markAsDirty();
      control.updateValueAndValidity();
      if (control.invalid) return;

      const seconds: number = this.playerService.omakasePlayer!.player.convertTime(control.value, MediaTemporalFormat.TIMECODE, MediaTemporalFormat.SECONDS);
      const secondsStr = String(seconds);
      const span = textCue.temporal as SpanTemporal;

      if (field === 'start') {
        this.textTrack().updateTimedItem(textCue.id, {temporal: {type: TimedItemTemporalType.SPAN, start: secondsStr, end: span.end}});
        this.startSeconds.set(secondsStr);
      } else {
        this.textTrack().updateTimedItem(textCue.id, {temporal: {type: TimedItemTemporalType.SPAN, start: span.start, end: secondsStr}});
        this.endSeconds.set(secondsStr);
      }
    }

    this.editingField.set(null);
    this.edited.emit();
  }

  cancelEdit() {
    this.editingField.set(null);
    this.startControl.markAsPristine();
    this.endControl.markAsPristine();
  }

  onTextareaEnter(event: Event) {
    if (!(event as KeyboardEvent).shiftKey) {
      event.preventDefault();
      this.saveEdit();
    }
  }

  private createStartValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const player = this.playerService.omakasePlayer?.player;
      if (!player) return null;

      let seconds: number;
      try {
        seconds = player.convertTime(control.value, MediaTemporalFormat.TIMECODE, MediaTemporalFormat.SECONDS);
      } catch {
        return {invalidTimecode: true};
      }

      const sorted = this.textTrack().timedItemsSorted as TextCue[];
      const idx = sorted.findIndex((c) => c.id === this.textCue().id);

      const prev = sorted[idx - 1];
      if (prev?.temporal.type === TimedItemTemporalType.SPAN && seconds < Number((prev.temporal as SpanTemporal).start)) {
        return {neighborOrder: 'Start cannot be earlier than previous cue start'};
      }

      const next = sorted[idx + 1];
      if (next?.temporal.type === TimedItemTemporalType.SPAN && seconds > Number((next.temporal as SpanTemporal).start)) {
        return {neighborOrder: 'Start cannot be later than next cue start'};
      }

      if (seconds >= Number(this.endSeconds())) {
        return {orderInvalid: 'Start must be before end'};
      }

      return null;
    };
  }

  private createEndValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const player = this.playerService.omakasePlayer?.player;
      if (!player) return null;

      let seconds: number;
      try {
        seconds = player.convertTime(control.value, MediaTemporalFormat.TIMECODE, MediaTemporalFormat.SECONDS);
      } catch {
        return {invalidTimecode: true};
      }

      if (seconds <= Number(this.startSeconds())) {
        return {orderInvalid: 'End must be after start'};
      }

      const sorted = this.textTrack().timedItemsSorted as TextCue[];
      const idx = sorted.findIndex((c) => c.id === this.textCue().id);
      const next = sorted[idx + 1];
      if (next?.temporal.type === TimedItemTemporalType.SPAN && seconds > Number((next.temporal as SpanTemporal).end)) {
        return {neighborOrder: 'End cannot be after next cue end'};
      }

      return null;
    };
  }
}
