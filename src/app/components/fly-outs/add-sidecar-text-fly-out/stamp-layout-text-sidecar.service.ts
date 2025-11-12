import {computed, inject, Injectable, signal} from '@angular/core';
import {ToastService} from '../../../common/toast/toast.service';
import {StampLayoutService} from '../../layouts/stamp-layout/stamp-layout.service';
import {LoadedSidecarText, SidecarText} from './text-sidecar.service';
import {AbstractSidecarTextService} from './text-sidecar.service.abstract';
import {filter, Observable, Subject, take, takeUntil} from 'rxjs';
import {StringUtil} from '../../../common/util/string-util';
import {PlayerChromingTheme, SubtitlesVttTrack} from '@byomakase/omakase-player';
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
   * Sidcar texts that are being loaded into Omakase player
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

    let label;

    if (sidecarText.label === '') {
      label = StringUtil.leafUrlToken(sidecarText.src);
    } else {
      label = sidecarText.label;
    }

    const id = crypto.randomUUID();
    const watermark = `Main Media + ${label}`;

    this.stampLayoutService
      .createStampPlayer({
        loadVideoIfPresent: true,
        isMainPlayer: false,
        playerChroming: {
          theme: PlayerChromingTheme.Default,
          watermark: watermark,
        },
      })
      .subscribe((playerId) => {
        const player = this.stampLayoutService.getPlayer(playerId)!;

        player.subtitles
          .createVttTrack({
            src: sidecarText.src,
            label: label!,
            id: id,
            language: '',
            default: false,
          })
          .pipe(takeUntil(this.stampLayoutService.onReset$))
          .subscribe({
            next: (textTrack: SubtitlesVttTrack) => {
              player.subtitles.showTrack(textTrack.id);
              this._pendingSidecarTexts.update((prev) => prev.filter((pst) => pst !== sidecarText));
              this.loadedSidecarTexts.update((prev) => [...prev, textTrack]);

              if (sidecarText.label === '') {
                this.noUserLabelSidecarTextIds.update((prev) => [...prev, textTrack.id]);
              }

              sidecarText.id = textTrack.id;
              if (showSuccessToast) {
                this.toastService.show({message: 'Sidecar successfully loaded', type: 'success', duration: 5000});
              }

              this.playersIdBySidecarId.set(id, playerId);
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
      this.removeSidecarTextInertial(sidecarText.id);
    }

    this._pendingSidecarTexts.update((prev) => prev.filter((sidecar) => sidecar !== sidecarText));
  }

  private removeSidecarTextInertial(sidecarTextId: string) {
    const playerId = this.playersIdBySidecarId.get(sidecarTextId)!;
    this.playersIdBySidecarId.delete(sidecarTextId);

    this.stampLayoutService.destroyStampPlayer(playerId);
    this.loadedSidecarTexts.update((prev) => prev.filter((loadedSidecarText) => loadedSidecarText.id !== sidecarTextId));
  }

  public override reloadSidecarTexts(sidecarTexts: SidecarText[]): void {
    this.loadedSidecarTexts().forEach((track) => {
      const playerId = this.playersIdBySidecarId.get(track.id)!;
      const player = this.stampLayoutService.getPlayer(playerId)!;

      player.subtitles.onSubtitlesLoaded$
        .pipe(
          filter((p) => !!p),
          take(1)
        )
        .subscribe(() => {
          player.subtitles
            .createVttTrack({
              src: track.src,
              label: track.label ?? '',
              id: track.id,
              default: false,
              language: '',
            })
            .subscribe(() => {
              player.subtitles.showTrack(track.id);
            });
        });
    });
  }

  public override removeAllSidecarTexts(): void {
    [...this.playersIdBySidecarId.values()].forEach((playerId) => this.stampLayoutService.destroyStampPlayer(playerId));
    this.loadedSidecarTexts.set([]);
    this._pendingSidecarTexts.set([]);
    this.noUserLabelSidecarTextIds.set([]);
    this.playersIdBySidecarId = new Map<string, string>();
  }
}
