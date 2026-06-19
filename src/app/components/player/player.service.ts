import {inject, Injectable, Injector, signal} from '@angular/core';
import {SimpleLayoutPlayerService} from './simple-layout-player.service';
import {StampLayoutPlayerService} from './stamp-layout-player.service';
import {OmakasePlayer, OmakasePlayerConfig, PlayerEventType} from '@byomakase/omakase-player';
import {BehaviorSubject, EMPTY, filter, merge, Observable, of, Subscription, switchMap, takeUntil} from 'rxjs';
import {Layout} from '../../model/session.model';
import {LayoutService} from '../layout-menu/layout.service';
import {AbstractPlayerService} from './player.service.abstract';

@Injectable({providedIn: 'root'})
export class PlayerService extends AbstractPlayerService {
  private layoutService = inject(LayoutService);
  private injector = inject(Injector);

  private currentService!: AbstractPlayerService;
  private currentSub: Subscription | undefined;

  public readonly onCreated$ = new BehaviorSubject<OmakasePlayer | undefined>(undefined);

  constructor() {
    super();

    this.layoutService.onLayoutChange$.subscribe((layout) => {
      this.setDelegateByLayout(layout);
    });
  }

  /**
   * Resolves the correct service to use based on the layout
   * @param layout
   * @returns
   */
  private resolveService(layout: Layout): AbstractPlayerService {
    switch (layout) {
      case 'stamp':
        return this.injector.get(StampLayoutPlayerService);
      default:
        return this.injector.get(SimpleLayoutPlayerService);
    }
  }

  private setDelegateByLayout(layout: Layout) {
    const newService = this.resolveService(layout);

    // handle subject switch
    this.currentSub?.unsubscribe();
    this.currentService = newService;
    this.onCreated$.next(newService.onCreated$.value);

    this.currentSub = newService.onCreated$.subscribe((player) => {
      this.onCreated$.next(player);
    });
  }

  /**
   * Returns current omakase player instance
   */
  get omakasePlayer(): OmakasePlayer | undefined {
    return this.currentService.omakasePlayer;
  }

  /**
   * Tracks if the player has been destroyed with the aim of being recreated
   */
  get isReloading(): boolean {
    return this.currentService.isReloading;
  }

  /**
   * Returns the thumbnail track url if present
   */
  get thumbnailTrackUrl(): ReturnType<typeof signal<string | undefined>> {
    return this.currentService.thumbnailTrackUrl;
  }

  get thumbnailTrack() {
    return this.currentService.thumbnailTrack;
  }

  /**
   * Creates a new omakase player instance
   *
   * @param {Partial<OmakasePlayerConfig>} config
   */
  create(config?: Partial<OmakasePlayerConfig>) {
    return this.currentService.create(config);
  }

  /**
   * Destroys Omakase player instance
   *
   * @param {boolean} shouldReload - Boolean indicating the intent of player recreation
   */
  destroy(shouldReload = false) {
    return this.currentService.destroy(shouldReload);
  }

  /**
   * Registers a thumbnail track into Omakase player and stores it in a signal
   *
   * @param {string} url
   * @returns
   */
  setThumbnailTrack(url: string | undefined) {
    return this.currentService.setThumbnailTrack(url);
  }

  get isMainMediaAudio() {
    return this.currentService.isMainMediaAudio;
  }

  /**
   * Returns an Observable that emits the OmakasePlayer each time main media is loaded,
   * or undefined when the player is destroyed.
   * Callers can pipe switchMap on the result for inner subscriptions that auto-teardown on each new emission.
   *
   * @param teardowns - additional Observables to terminate the outer subscription (e.g. destroyed$)
   */
  observeMediaLoads(...teardowns: Observable<any>[]): Observable<OmakasePlayer | undefined> {
    let result$: Observable<OmakasePlayer | undefined> = this.onCreated$.pipe(
      switchMap((omakasePlayer) => {
        if (!omakasePlayer) return of(undefined);

        return new Observable<OmakasePlayer>((observer) => {
          if (omakasePlayer.player.mainMedia) {
            observer.next(omakasePlayer);
          }
          omakasePlayer.player.onEvent$
            .pipe(filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_LOADED))
            .subscribe(() => {
              observer.next(omakasePlayer);
            });
        });
      })
    );

    if (teardowns.length > 0) {
      result$ = result$.pipe(takeUntil(merge(...teardowns)));
    }

    return result$;
  }
}
