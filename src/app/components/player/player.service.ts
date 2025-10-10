import {inject, Injectable, Injector, signal} from '@angular/core';
import {SimpleLayoutPlayerService} from './simple-layout-player.service';
import {OmakasePlayer, OmakasePlayerConfig} from '@byomakase/omakase-player';
import {BehaviorSubject, Subscription} from 'rxjs';
import {Layout} from '../../model/session.model';
import {LayoutService} from '../layout-menu/layout.service';
import {AbstractPlayerService} from './player.service.abstract';
import {StampLayoutPlayerService} from './stamp-layout-player.service';

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
      case 'simple':
      case 'audio':
      case 'marker':
      case 'timeline':
      case 'chromeless':
      case 'editorial':
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
}
