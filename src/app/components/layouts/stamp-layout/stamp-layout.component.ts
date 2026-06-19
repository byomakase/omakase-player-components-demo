import {afterRender, Component, computed, effect, inject, OnDestroy} from '@angular/core';
import {Subject, filter, take, takeUntil} from 'rxjs';
import {MarkerTrackService, SidecarMarkerTrack} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {ColorService} from '../../../common/services/color.service';
import {StampLayoutService} from './stamp-layout.service';
import {ChromingTrackDestination, MarkerStyle, MarkerTrack as OmakaseMarkerTrack, MarkerTrackStyle, OmakasePlayer, PlayerEventType, TrackSource, TrackType} from '@byomakase/omakase-player';

@Component({
  selector: 'app-stamp-layout',
  host: {class: 'stamp-layout'},
  template: `
    <div class="grid-container">
      @if (playerIds().length) {
        @for (playerId of playerIds(); track playerId) {
          <div [id]="playerId"></div>
        }
      } @else {
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

  public idPlayer(id: string) {
    return id;
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
    });

    // sync marker tracks
    effect(() => {
      const loadedMarkerTracks = this.markerTrackService.loadedMarkerTracks();
      const instantiatedPlayerIds = this.stampLayoutService.instantiatedPlayerIds();

      const targetAssignments = new Map<string, string>();
      loadedMarkerTracks.forEach((markerTrack, idx) => {
        const playerId = instantiatedPlayerIds[idx];
        if (playerId) targetAssignments.set(markerTrack.id!, playerId);
      });

      [...this.playerIdsByMarkerTrackIds.entries()].forEach(([markerTrackId, currentPlayerId]) => {
        const targetPlayerId = targetAssignments.get(markerTrackId);
        if (targetPlayerId !== currentPlayerId) {
          const player = this.stampLayoutService.getPlayer(currentPlayerId);
          if (player?.chroming.getMarkerBar(ChromingTrackDestination.PROGRESS_BAR)) {
            player.chroming.deleteMarkerBar(ChromingTrackDestination.PROGRESS_BAR);
          }
          this.playerIdsByMarkerTrackIds.delete(markerTrackId);
        }
      });

      targetAssignments.forEach((targetPlayerId, markerTrackId) => {
        if (this.playerIdsByMarkerTrackIds.get(markerTrackId) === targetPlayerId) return;

        const markerTrack = loadedMarkerTracks.find((t) => t.id === markerTrackId)!;
        const player = this.stampLayoutService.getPlayer(targetPlayerId)!;
        this.playerIdsByMarkerTrackIds.set(markerTrackId, targetPlayerId);

        const onMainMediaLoaded = () => {
          this.createMarkerTrack(player, markerTrack);

          player.player.onEvent$
            .pipe(
              filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_UNLOADED),
              take(1),
              takeUntil(this.destroyed$)
            )
            .subscribe(() => {
              this.playerIdsByMarkerTrackIds.delete(markerTrack.id!);
            });
        };

        if (player.player.mainMedia) {
          onMainMediaLoaded();
        } else {
          player.player.onEvent$
            .pipe(
              filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_LOADED),
              take(1),
              takeUntil(this.destroyed$)
            )
            .subscribe(() => onMainMediaLoaded());
        }
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
  private createMarkerTrack(player: OmakasePlayer, markerTrack: SidecarMarkerTrack) {
    const existing = player.chroming.getMarkerBar(ChromingTrackDestination.PROGRESS_BAR);
    if (existing) {
      player.chroming.deleteMarkerBar(ChromingTrackDestination.PROGRESS_BAR);
    }
    if (!markerTrack) return;

    const colorResolver = this.colorService.createColorResolver(crypto.randomUUID(), this.markerTrackService.HEX_COLORS);

    player.track.load(markerTrack.src, {trackType: TrackType.MARKER_TRACK}).subscribe((loadedTrack) => {
      player.ui.updateStyleRule<MarkerTrackStyle>({
        id: loadedTrack.id,
        style: {momentToSpanningThreshold: 1},
      });
      (loadedTrack as OmakaseMarkerTrack).timedItemsSorted.forEach((timedItem) => {
        const color = markerTrack.color !== 'multicolor' ? markerTrack.color : colorResolver.getColor(true);
        player.ui.updateStyleRule<MarkerStyle>({
          id: timedItem.id,
          style: {markerColor: color},
        });
      });

      player.chroming.addMarkerBar(TrackSource.fromTrack(loadedTrack), ChromingTrackDestination.PROGRESS_BAR, {trackType: TrackType.MARKER_TRACK}, {visible: true});
    });
  }
}
