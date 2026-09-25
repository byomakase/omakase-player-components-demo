import {computed, inject, Injectable, signal} from '@angular/core';
import {ToastService} from '../../../common/toast/toast.service';
import {StampLayoutService} from '../../layouts/stamp-layout/stamp-layout.service';
import {LoadedSidecarText, SidecarText} from './text-sidecar.service';
import {AbstractSidecarTextService} from './text-sidecar.service.abstract';
import {Observable, Subject, switchMap, takeUntil} from 'rxjs';
import {StringUtil} from '../../../common/util/string-util';
import {ChromingTheme, TimeReference, Track, TrackType} from '@byomakase/omakase-player';

@Injectable({
  providedIn: 'root',
})
export class StampLayoutSidecarTextService extends AbstractSidecarTextService {
  private toastService = inject(ToastService);
  private stampLayoutService = inject(StampLayoutService);

  /**
   * Sidecar texts that have been successfully loaded into Omakase player
   */
  public loadedSidecarTexts = signal<LoadedSidecarText[]>([]);
  /**
   * Sidecar texts that are being loaded into Omakase player
   */
  private _pendingSidecarTexts = signal<SidecarText[]>([]);

  /**
   * sidecar text ids for which the user did not provide label
   */
  public noUserLabelSidecarTextIds = signal<string[]>([]);

  public sidecarTexts = computed(() => {
    return [...this.loadedSidecarTexts(), ...this._pendingSidecarTexts()];
  });

  private playersIdBySidecarId = new Map<string, string>();

  public override addSidecarText(sidecarText: SidecarText, showSuccessToast: boolean): Observable<boolean> {
    const result$ = new Subject<boolean>();
    this._pendingSidecarTexts.update((prev) => [...prev, sidecarText]);

    const label = sidecarText.label === '' || sidecarText.label === undefined ? StringUtil.leafUrlToken(sidecarText.src) : sidecarText.label;

    const watermark = `Main Media + ${label}`;

    this.stampLayoutService
      .createStampPlayer({
        loadVideoIfPresent: true,
        isMainPlayer: false,
        chromingTheme: ChromingTheme.STAMP,
        chromingWatermark: watermark,
      })
      .subscribe((playerId) => {
        const player = this.stampLayoutService.getPlayer(playerId)!;

        this.prepareTextTrackSource(sidecarText, player)
          .pipe(
            switchMap((source) =>
              player.player.loadSidecarTrack(source, {
                trackType: TrackType.TEXT_TRACK,
                handlerType: sidecarText.engine,
                args: {label: sidecarText.label !== '' ? sidecarText.label : undefined},
                // Slew (and any FFOM offset) is already baked into the source, so load self-referenced.
                timeReference: TimeReference.SELF,
              })
            ),
            takeUntil(this.stampLayoutService.onReset$)
          )
          .subscribe({
            next: (textTrack: Track) => {
              player.player.text.switchTrack(textTrack.id);
              this._pendingSidecarTexts.update((prev) => prev.filter((pst) => pst !== sidecarText));
              sidecarText.id = textTrack.id;
              this.loadedSidecarTexts.update((prev) => [...prev, sidecarText as LoadedSidecarText]);

              if (sidecarText.label === '') {
                this.noUserLabelSidecarTextIds.update((prev) => [...prev, textTrack.id]);
              }

              if (showSuccessToast) {
                this.toastService.show({message: 'Sidecar successfully loaded', type: 'success', duration: 5000});
              }

              this.playersIdBySidecarId.set(textTrack.id, playerId);
              result$.next(true);
              result$.complete();
            },
            error: () => {
              this.removeSidecarText(sidecarText);
              if (!sidecarText.id) {
                this.stampLayoutService.destroyStampPlayer(playerId);
              }
              this.toastService.show({message: 'Sidecar load failed', type: 'error', duration: 5000});
              result$.next(false);
              result$.complete();
            },
          });
      });
    return result$;
  }

  public override removeSidecarText(sidecarText: SidecarText) {
    if (sidecarText.id) {
      const playerId = this.playersIdBySidecarId.get(sidecarText.id);
      this.playersIdBySidecarId.delete(sidecarText.id);
      if (playerId) {
        this.stampLayoutService.destroyStampPlayer(playerId);
      }
      this.loadedSidecarTexts.update((prev) => prev.filter((loaded) => loaded.id !== sidecarText.id));
    }

    this._pendingSidecarTexts.update((prev) => prev.filter((sidecar) => sidecar !== sidecarText));
  }

  public override reset(): void {
    [...this.playersIdBySidecarId.values()].forEach((playerId) => this.stampLayoutService.destroyStampPlayer(playerId));
    this.loadedSidecarTexts.set([]);
    this._pendingSidecarTexts.set([]);
    this.noUserLabelSidecarTextIds.set([]);
    this.playersIdBySidecarId = new Map<string, string>();
  }
}
