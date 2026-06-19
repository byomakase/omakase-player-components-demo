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

import {inject, Injectable} from '@angular/core';
import {filter, forkJoin, Observable, of, switchMap, take} from 'rxjs';
import {LayoutService} from '../../components/layout-menu/layout.service';
import {SidecarAudioService} from '../../components/fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {SidecarTextService} from '../../components/fly-outs/add-sidecar-text-fly-out/text-sidecar.service';
import {PlayerService} from '../../components/player/player.service';
import {HttpClient} from '@angular/common/http';
import {ChartType, Layout, SessionData, SidecarMedia, TrackVisualization} from '../../model/session.model';
import {MarkerTrackService} from '../../components/fly-outs/add-markers-fly-out/marker-track.service';
import {ColorService} from '../services/color.service';
import {ToastService} from '../toast/toast.service';
import {sessionSchema} from './session-validator';
import {ObservationTrackService, ObservationTrackVisualization} from '../../components/fly-outs/add-observation-track-fly-out/observation-track.service';
import {Constants} from '../../constants/constants';
import {FlyOutService} from '../../components/fly-outs/fly-out.service';
import {ColorUtil} from '../util/color-util';
import {StringUtil} from '../util/string-util';
import {PlayerTextHandlerType, SessionEventType, SourceType, UrlSource, WindowPlaybackMode} from '@byomakase/omakase-player';
import {ProbingUtil} from '../util/probing-util';

/**
 * Service handling layout switching inside a session. All layout switches MUST be done through this service so that all loaded media is preserved.
 * Since audio sidecar service is dependant on the layout service, any bilateral interplay between the two SHOULD be handled through this service.
 * This service should function as the top most service and SHOULD NOT be injected into any other service.
 */
@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private layoutService = inject(LayoutService);
  private sidecarAudioService = inject(SidecarAudioService);
  private sidecarTextService = inject(SidecarTextService);
  private playerService = inject(PlayerService);
  private markerTrackService = inject(MarkerTrackService);
  private observationTrackService = inject(ObservationTrackService);
  private http = inject(HttpClient);
  private colorService = inject(ColorService);
  private observationTracksColorResolver = this.colorService.createColorResolver(Constants.COLOR_RESOLVER_IDS.observationTrack, this.observationTrackService.COLORS);
  private toastService = inject(ToastService);
  private flyOutService = inject(FlyOutService);

  /**
   * Change layout and reload all media that has been loaded.
   *
   * @param {Layout} layout
   */
  public changeLayoutAndReloadMedia(layout: Layout) {
    if (this.playerService.omakasePlayer) {
      const video = this.playerService.omakasePlayer.player.mainMedia;
      const videoLoadOptions = this.playerService.omakasePlayer.player.mainMedia?.state.loadOptions;

      const isMainMediaAudio = this.playerService.isMainMediaAudio;

      const audioSidecars = this.sidecarAudioService.sidecarAudios();
      // const noUserLabelSidecarAudioIds = this.sidecarAudioService.noUserLabelSidecarAudioIds();
      const textSidecars = this.sidecarTextService.sidecarTexts();
      const thumbnailTrack = this.playerService.thumbnailTrackUrl();
      const markerTracks = this.markerTrackService.loadedMarkerTracks();
      this.markerTrackService.removeAllMarkerTracks();
      const observationTracks = this.observationTrackService.loadedObservationTracks();
      this.observationTrackService.removeAllObservationTracks();

      const attached$ = new Observable<void>((observer) => {
        const windowPlaybackMode = this.playerService.omakasePlayer!.session.state.windowPlayback.mode;
        if (windowPlaybackMode === WindowPlaybackMode.DETACHED) {
          this.playerService.omakasePlayer!.attachPlayer().subscribe(() => {
            observer.next();
            observer.complete();
          });
        } else if (windowPlaybackMode === WindowPlaybackMode.DETACHING) {
          this.playerService
            .omakasePlayer!.session.onEvent$.pipe(
              filter((event) => event.type === SessionEventType.SESSION_WINDOW_PLAYBACK_UPDATED),
              take(1)
            )
            .subscribe(() => {
              this.playerService.omakasePlayer!.attachPlayer().subscribe(() => {
                observer.next();
                observer.complete();
              });
            });
        } else if (windowPlaybackMode === WindowPlaybackMode.ATTACHING) {
          this.playerService
            .omakasePlayer!.session.onEvent$.pipe(
              filter((event) => event.type === SessionEventType.SESSION_WINDOW_PLAYBACK_UPDATED),
              take(1)
            )
            .subscribe(() => {
              observer.next();
              observer.complete();
            });
        } else if (windowPlaybackMode === WindowPlaybackMode.FAILURE) {
          observer.error('Window playback mode in failure state');
          observer.complete();
        } else {
          observer.next();
          observer.complete;
        }
      });

      attached$.subscribe(() => {
        this.playerService.destroy(true);
        if (video && video.source.type === SourceType.URL) {
          this.playerService.onCreated$
            .pipe(
              filter((p) => !!p),
              take(1)
            )
            .subscribe((player) => {
              player.loadMainMedia((video.source as UrlSource).url, videoLoadOptions).subscribe(() => {
                if (thumbnailTrack) {
                  this.playerService.setThumbnailTrack(thumbnailTrack);
                }

                audioSidecars.forEach((sidecar) => {
                  // const label = noUserLabelSidecarAudioIds.includes(sidecar.id!) ? '' : sidecar.label;
                  const label = sidecar.label;
                  this.sidecarAudioService.addSidecarAudio({src: sidecar.src, label: label}, false);
                });

                textSidecars.forEach((sidecar) => {
                  // const label = this.sidecarTextService.noUserLabelSidecarTextIds().includes(sidecar.id!) ? '' : sidecar.label;
                  const label = sidecar.label;

                  this.sidecarTextService.addSidecarText({src: sidecar.src, label: label, engine: sidecar.engine}, false);
                });

                markerTracks.forEach((markerTrack) => {
                  this.markerTrackService.addMarkerTrack({src: markerTrack.src, color: markerTrack.color, readOnly: markerTrack.readOnly, label: markerTrack.label}, false);
                });

                observationTracks.forEach((observationTrack) => {
                  this.observationTrackService.addObservationTrack(
                    {
                      id: observationTrack.id,
                      src: observationTrack.src,
                      label: observationTrack.label,
                      visualization: observationTrack.visualization,
                      color: observationTrack.color,
                      minValue: observationTrack.minValue,
                      maxValue: observationTrack.maxValue,
                    },
                    false
                  );
                });
              });
            });
        }
        this.layoutService.layout = layout;

        this.layoutService.onLayoutInitialized$
          .pipe(
            filter((p) => !!p),
            take(1)
          )
          .subscribe(() => {
            this.playerService.create(this.layoutService.getPlayerConfiguration(isMainMediaAudio));
          });
      });
    } else {
      this.layoutService.layout = layout;
    }
  }

  fetchSessionData(sessionUrl: string): Observable<SessionData> {
    return this.http.get<SessionData>(sessionUrl);
  }

  bootstrapApplication(sessionData: SessionData) {
    try {
      sessionSchema.parse(sessionData);
    } catch (e) {
      this.toastService.show({message: 'Session configuration failed', type: 'error', duration: 5000});
      console.error(e);
      return;
    }

    if (sessionData.presentation?.layouts.length !== undefined && sessionData.presentation?.layouts.length > 0) {
      this.layoutService.layouts = sessionData.presentation.layouts;
      if (this.layoutService.layouts.length === 0) {
        this.toastService.show({message: 'Session configuration failed - no supported layouts', type: 'error', duration: 5000});
        return;
      } else if (this.layoutService.layouts.length !== sessionData.presentation.layouts.length) {
        this.toastService.show({message: 'Some of the layouts are not supported', type: 'warning', duration: 5000});
      }
      this.layoutService.layout = this.layoutService.layouts.at(0)!;
    }

    if (sessionData.presentation?.disable_media_fly_outs === true) {
      this.flyOutService.flyoutsEnabled.set(false);
    }

    this.playerService.destroy(true);
    this.layoutService.onLayoutInitialized$
      .pipe(
        filter((p) => !!p),
        take(1)
      )
      .subscribe(() => {
        if (sessionData.media) {
          const mainMedia = sessionData.media.main.at(0)!; // load only the first media
          const isMainMediaAudio = StringUtil.isAudioFile(StringUtil.leafUrlToken(mainMedia.url));

          this.playerService.create(this.layoutService.getPlayerConfiguration(isMainMediaAudio)).subscribe((player) => {
            player
              .loadMainMedia(mainMedia.url, {
                frameRate: mainMedia.frame_rate,
                ffom: mainMedia.ffom,
                dropFrame: mainMedia.drop_frame,
              })
              .subscribe(() => {
                let visualizationsMap = undefined;
                if (sessionData.presentation?.track_visualization) {
                  visualizationsMap = new Map<string, TrackVisualization>(Object.entries(sessionData.presentation.track_visualization));
                }
                this.bootstrapSidecarMedia(sessionData.media!.sidecars!, visualizationsMap);
              });
          });
        }
      });
  }

  bootstrapSidecarMedia(sidecarMedias: SidecarMedia[], trackVisualizations: Map<string, TrackVisualization> | undefined) {
    const thumbnailMedia = sidecarMedias.find((sidecarMedia) => sidecarMedia.type === 'thumbnail');
    const sidecarAudios = sidecarMedias.filter((sidecarMedia) => sidecarMedia.type === 'audio');
    const sidecarTexts = sidecarMedias.filter((sidecarMedia) => sidecarMedia.type === 'text');
    const markerTracks = sidecarMedias.filter((sidecarMedia) => sidecarMedia.type === 'marker');
    const observationTracks = sidecarMedias.filter((sidecarMedia) => sidecarMedia.type === 'observation');
    if (thumbnailMedia) {
      this.playerService.setThumbnailTrack(thumbnailMedia.url);
    }
    const audiosLoaded$ = sidecarAudios.map((sidecarAudio) => this.sidecarAudioService.addSidecarAudio({src: sidecarAudio.url, label: sidecarAudio.label}, false));
    const textsLoaded$ = sidecarTexts.map((sidecarText) => {
      const engine$ = sidecarText.engine
        ? of(sidecarText.engine as PlayerTextHandlerType)
        : ProbingUtil.resolveTextEngine(this.playerService.omakasePlayer!, sidecarText.url);
      return engine$.pipe(
        switchMap((playerTextHandlerType) => {
          if (playerTextHandlerType) {
            return this.sidecarTextService.addSidecarText({src: sidecarText.url, label: sidecarText.label, engine: playerTextHandlerType}, false);
          } else {
            return of(false);
          }
        })
      );
    });
    markerTracks.forEach((markerTrack) => {
      let color;
      let readOnly;
      if (markerTrack.id) {
        color = ColorUtil.parseHexColor(trackVisualizations?.get(markerTrack.id)?.color);
        readOnly = trackVisualizations?.get(markerTrack.id)?.read_only;
      }
      this.markerTrackService.addMarkerTrack(
        {id: markerTrack.id ?? crypto.randomUUID(), src: markerTrack.url, label: markerTrack.label, color: color ?? 'multicolor', readOnly: readOnly ?? false},
        false
      );
    });
    observationTracks.forEach((observationTrack) => {
      const id = observationTrack.id ?? crypto.randomUUID();
      const visualization = this.resolveVisualization(trackVisualizations?.get(id)?.chart_type);
      const color = ColorUtil.parseHexColor(trackVisualizations?.get(id)?.color);
      this.observationTrackService.addObservationTrack(
        {
          id: id,
          visualization: visualization,
          src: observationTrack.url,
          color: color ?? this.observationTracksColorResolver.getColor(true),
          label: observationTrack.label,
          minValue: trackVisualizations?.get(id)?.y_min,
          maxValue: trackVisualizations?.get(id)?.y_max,
        },
        false
      );
    });
    forkJoin([...audiosLoaded$, ...textsLoaded$]).subscribe((results: boolean[]) => {
      const allTrue = results.every((r) => r === true);
      const allFalse = results.every((r) => r === false);
      const someFalse = results.includes(false);
      const someTrue = results.includes(true);
      if (allTrue) {
        this.toastService.show({message: 'Session configured successfully', type: 'success', duration: 5000});
      } else if (allFalse) {
        this.toastService.show({message: 'Session configuration failed', type: 'error', duration: 5000});
      } else if (someFalse && someTrue) {
        this.toastService.show({message: 'Session configuration succeeded but some sidecars failed to load', type: 'warning', duration: 5000});
      }
    });
  }

  private resolveVisualization(chartType: ChartType | undefined): ObservationTrackVisualization {
    if (chartType === 'bar_chart') {
      return 'bar-chart';
    }

    if (chartType === 'led_chart') {
      return 'led-chart';
    }

    return 'line-chart';
  }

  constructor() {}
}
