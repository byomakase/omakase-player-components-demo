import {afterRender, Component, computed, effect, inject, OnDestroy} from '@angular/core';
import {MomentMarker, OmakasePlayer, PeriodMarker} from '@byomakase/omakase-player';
import {Subject, filter, take, takeUntil} from 'rxjs';
import {MarkerTrackService, MarkerTrack} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {ColorService} from '../../../common/services/color.service';
import {StampLayoutService} from './stamp-layout.service';

@Component({
  selector: 'app-stamp-layout',
  host: {class: 'stamp-layout'},
  template: `
    <div class="grid-container">
      @if(playerIds().length) { @for (id of playerIds(); track id) {
      <div [id]="id"></div>
      } } @else {
      <div class="player-placeholder"></div>
      }
    </div>
  `,
})
export class StampLayoutComponent implements OnDestroy {
  public markerTrackService = inject(MarkerTrackService);
  private destroyed$ = new Subject<void>();
  private colorService = inject(ColorService);

  private stampLayoutService = inject(StampLayoutService);

  public playerIds = computed(() => [...this.stampLayoutService.instantiatedPlayerIds(), ...this.stampLayoutService.pendingPlayerIds()]);
  private playerIdsByMarkerTrackIds = new Map<string, string>();

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
    this.stampLayoutService.reset();
  }

  constructor() {
    // updates marker track visualization data structures based on deleted players and confirms player deletion
    effect(() => {
      const idsToRemove = this.stampLayoutService.pendingDestructionPlayerIds();
      if (idsToRemove.length) {
        const markerTrackIds = [...this.playerIdsByMarkerTrackIds.entries()].filter(([, playerId]) => idsToRemove.includes(playerId)).map(([markerTrackId]) => markerTrackId);

        markerTrackIds.forEach((id) => this.playerIdsByMarkerTrackIds.delete(id));
      }

      idsToRemove.forEach((id) => this.stampLayoutService.confirmPlayerDestruction(id));
    });

    // after the dom is painted, check if there are players to be instantiated in newly created divs
    afterRender(() => {
      const pending = this.stampLayoutService.pendingPlayerIds();
      if (pending.length) {
        pending.forEach((id) => {
          const config = this.stampLayoutService.getPendingPlayerConfig(id);
          const target = document.getElementById(id);

          if (!config || !target) {
            console.warn(`DOM not ready or config missing for player ${id}`);
            return;
          }

          const player = new OmakasePlayer(config);
          this.stampLayoutService.registerStampPlayer(id, player);
        });
      }

      this.markerTrackService.markerTracks().forEach((markerTrack) => {
        let playerId = this.playerIdsByMarkerTrackIds.get(markerTrack.id);
        if (!playerId) {
          playerId = this.stampLayoutService.instantiatedPlayerIds().find((id) => ![...this.playerIdsByMarkerTrackIds.values()].includes(id));
        } else {
          return;
        }

        if (!playerId) return;

        const player = this.stampLayoutService.getPlayer(playerId)!;
        this.playerIdsByMarkerTrackIds.set(markerTrack.id, playerId);

        player.video.onVideoLoaded$
          .pipe(
            filter((p) => !!p),
            take(1),
            takeUntil(this.destroyed$)
          )
          .subscribe(() => {
            this.createMarkerTrack(player, markerTrack);

            // on video reload remove marker track
            player.video.onVideoLoaded$
              .pipe(
                filter((p) => !p),
                take(1),
                takeUntil(this.destroyed$)
              )
              .subscribe(() => {
                this.playerIdsByMarkerTrackIds.delete(markerTrack.id);
              });
          });
      });
    });
  }

  /**
   * Presents a marker track inside progress bar chroming. If a marker track has been previously
   * set, it will be cleared.
   *
   * @param player - Omakase player instance that should present a marker track
   * @param markerTrack - Marker track to present in the Omakase player
   * @returns
   */
  private createMarkerTrack(player: OmakasePlayer, markerTrack: MarkerTrack) {
    player.progressMarkerTrack?.removeAllMarkers();
    if (!markerTrack) return;

    const colorResolver = this.colorService.createColorResolver(crypto.randomUUID(), this.markerTrackService.HEX_COLORS);

    player.progressMarkerTrack?.loadVtt(markerTrack.src, {
      vttMarkerCreateFn(cue, index) {
        const name = '';
        const color = markerTrack.color !== 'multicolor' ? markerTrack.color : colorResolver.getColor(true);

        if (cue.endTime - cue.startTime < 1) {
          return new MomentMarker({
            timeObservation: {time: cue.startTime},
            style: {color},
            editable: !markerTrack.readOnly,
            text: name === '' ? `Marker ${index + 1}` : name,
          });
        } else {
          return new PeriodMarker({
            timeObservation: {
              start: cue.startTime,
              end: cue.endTime,
            },
            style: {color},
            editable: !markerTrack.readOnly,
            text: name === '' ? `Marker ${index + 1}` : name,
          });
        }
      },
    });
  }
}
