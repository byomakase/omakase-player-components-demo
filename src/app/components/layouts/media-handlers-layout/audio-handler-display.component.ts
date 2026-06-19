import {Component, input, signal, OnInit, computed, AfterViewInit, inject, AfterContentInit, effect, ViewChild, ElementRef} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {AudioHandlerApi, AudioState, MainMediaType, PlayerAudioType, PlayerEventType, RouterVisualization, RouterVisualizationTrack} from '@byomakase/omakase-player';
import {PlayerService} from '../../player/player.service';
import {WindowService} from '../../../common/browser/window.service';
import {filter} from 'rxjs';
import {IconDirective} from '../../../common/icon/icon.directive';

@Component({
  selector: 'app-audio-handler-display',
  standalone: true,
  imports: [ReactiveFormsModule, IconDirective],
  template: `
    <div class="dropdown-container">
      <div class="dropdown-button" (click)="toggleDropdown()">
        <span class="label">{{ label() }}</span>
        <i [appIcon]="dropdownOpen() ? 'chevron-down' : 'chevron-right'"></i>
      </div>

      @if (dropdownOpen()) {
        <div class="dropdown-menu">
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
          <div #routerContainer class="router-container">
            <div [id]="routerId"></div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AudioHandlerDisplayComponent implements OnInit {
  private playerService = inject(PlayerService);
  private windowService = inject(WindowService);
  audioHandler = input.required<AudioHandlerApi>();
  label = input.required<string>();
  audioState = input<AudioState>();
  isMain = input<boolean>(false);

  dropdownOpen = signal(false);

  volumeControl = new FormControl<number>(1);

  routerId = `router-visualization-${crypto.randomUUID()}`;

  ngOnInit(): void {
    this.volumeControl.valueChanges.subscribe((value) => {
      if (value !== null) {
        this.audioHandler().setVolume(value);
      }
    });

    // this.playerService.omakasePlayer!.player.onEvent$.pipe(filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_LOADED)).subscribe(() => this.createRouterVisualization());
  }

  toggleDropdown(): void {
    this.dropdownOpen.update((open) => !open);
  }

  toggleMute(): void {
    const handler = this.audioHandler();

    handler.setMuted(!handler.muted);
  }

  createVisualizationTrack(): RouterVisualizationTrack {
    if (this.audioState()) {
      return {
        maxInputNumber: 6,
        inputNumber: this.audioState()!.channels,
        trackId: this.audioState()!.id,
      };
    } else {
      return {
        maxInputNumber: 6,
      };
    }
  }

  @ViewChild('routerContainer')
  set container(el: ElementRef<HTMLDivElement>) {
    if (el) {
      this.createRouterVisualization();
    }
  }

  private createRouterVisualization() {
    if (this.shouldDisplayRouter()) {
      new RouterVisualization({routerVisualizationHTMLElementId: this.routerId, size: 'medium', visualizationTracks: [this.createVisualizationTrack()]}, this.playerService.omakasePlayer!);
    }
  }

  private shouldDisplayRouter() {
    const isHls = this.playerService.omakasePlayer?.player.mainMedia?.mainMediaType === MainMediaType.HLS;
    const isSafari = this.windowService.isUserAgent('safari');
    return !(isHls && isSafari && this.isMain());
  }
}
