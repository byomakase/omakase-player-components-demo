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

import {Signal} from '@angular/core';
import {map, Observable, of} from 'rxjs';
import {LoadedSidecarText, SidecarText} from './text-sidecar.service';
import {FileFormat, FileFormatType, MediaTemporalConverter, MediaTemporalFormat, OmakasePlayer, OutputTextFileFormatType, SlewOptions, Source, TrackSource, UrlSource} from '@byomakase/omakase-player';

// export type SidecarAudio = Partial<OmpAudioTrack> & {src: string};

export abstract class AbstractSidecarTextService {
  abstract loadedSidecarTexts: Signal<LoadedSidecarText[]>;
  abstract noUserLabelSidecarTextIds: Signal<string[]>;
  abstract sidecarTexts: Signal<SidecarText[]>;

  abstract addSidecarText(sidecarText: SidecarText, showSuccessToast: boolean): Observable<boolean>;
  abstract removeSidecarText(sidecarText: SidecarText): void;
  abstract reset(): void;

  protected resolveConversionFormat(sidecarText: SidecarText): OutputTextFileFormatType | undefined {
    if (sidecarText.probedFileFormat === FileFormat.SCC) {
      return FileFormatType.TTML;
    }

    return undefined;
  }

  /**
   * Resolves the source to load for a sidecar text.
   *
   * When a slew is specified, the format needs converting to be slewable/renderable, or the main media
   * declares an FFOM offset, the track is converted (cues time-shifted where applicable) and the derived
   * track is loaded; otherwise the original source is loaded directly. A converted track already carries
   * its final timing, so callers should load it self-referenced (TimeReference.SELF) to avoid re-applying
   * the offset.
   *
   * @param {SidecarText} sidecarText
   * @param {OmakasePlayer} omakasePlayer player the track is loaded into; its main media supplies the FFOM offset
   */
  protected prepareTextTrackSource(sidecarText: SidecarText, omakasePlayer: OmakasePlayer): Observable<Source> {
    const conversionFormat = this.resolveConversionFormat(sidecarText);
    const ffomTimecode = omakasePlayer.player.mainMedia?.ffomTimecodeModel;

    if (!sidecarText.slew && !conversionFormat && !ffomTimecode) {
      return of<Source>(UrlSource.of(sidecarText.src));
    }

    let slewOptions: SlewOptions | undefined;
    if (ffomTimecode) {
      // Convert the FFOM timecode to seconds with a raw converter (no ffomTimecodeModel), since an
      // FFOM-aware converter would map the FFOM timecode back to 0. Fold that offset into the user slew.
      const ffomSeconds = MediaTemporalConverter.create({
        frameRateModel: ffomTimecode.frameRateModel,
        hasVideo: ffomTimecode.hasVideo,
        hasAudio: ffomTimecode.hasAudio,
      }).convert(ffomTimecode.valueText, MediaTemporalFormat.TIMECODE, MediaTemporalFormat.SECONDS);
      slewOptions = {timeSlew: (sidecarText.slew ?? 0) - ffomSeconds, expectedFrameRate: ffomTimecode.frameRateModel.value};
    } else if (sidecarText.slew !== undefined) {
      slewOptions = {timeSlew: sidecarText.slew};
    }

    return omakasePlayer.track.utils
      .convertTextTrack(sidecarText.src, {
        outputFormat: conversionFormat,
        slewOptions,
      })
      .pipe(map((track): Source => TrackSource.of(track.id)));
  }
}
