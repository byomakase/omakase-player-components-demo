import {Component, input, signal, OnInit, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {AudioHandlerApi} from '@byomakase/omakase-player';
import {Subject, takeUntil} from 'rxjs';

@Component({
  selector: 'app-output-audio-handler-display',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="volume-controls-container">
      <button (click)="toggleMute()">
        @if (audioHandler().muted) {
          Unmute
        } @else {
          Mute
        }
      </button>

      <div class="volume-control-wrapper">
        <div class="volume-range-wrapper">
          <input class="volume-range" type="range" step="0.01" min="0" max="1" [formControl]="volumeControl" [style.--fill.%]="(volumeControl.value ?? 0) * 100" />
        </div>
      </div>
    </div>
  `,
})
export class OutputAudioHandlerDisplayComponent implements OnInit, OnDestroy {
  audioHandler = input.required<AudioHandlerApi>();
  private destroyed$ = new Subject<void>();

  volumeControl = new FormControl<number>(1);

  ngOnInit(): void {
    this.volumeControl.valueChanges.subscribe((value) => {
      if (value !== null) {
        this.audioHandler().setVolume(value);
      }
    });

    this.audioHandler()
      .onEvent$.pipe(takeUntil(this.destroyed$))
      .subscribe((event) => {
        this.volumeControl.setValue(event.data.state.volume, {emitEvent: false});
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  toggleMute(): void {
    const handler = this.audioHandler();
    handler.setMuted(!handler.muted);
  }
}
