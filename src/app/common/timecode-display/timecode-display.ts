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
import {Observable, Subject, takeUntil} from 'rxjs';

/**
 * Pure typescript component used to render current media timecode without triggering
 * angular rerender. It accepts a timecode observable that streams current media
 * timecode.
 */
class TimecodeDisplay extends HTMLElement {
  private _timecodeContainer!: HTMLDivElement;
  private _destroyed$ = new Subject<void>();
  private _timecode$?: Observable<string>;

  constructor() {
    super();
  }

  set timecode$(observable: Observable<string> | undefined) {
    if (this._timecode$) {
      this._destroyed$.next(); // unsubscribe previous
    }
    this._timecode$ = observable;
    this._subscribe();
  }

  connectedCallback() {
    this._timecodeContainer = document.createElement('div');
    this.appendChild(this._timecodeContainer);
    this._subscribe();
  }

  disconnectedCallback() {
    this._destroyed$.next();
    this._destroyed$.complete();
  }

  private _subscribe() {
    if (this._timecode$) {
      this._timecode$.pipe(takeUntil(this._destroyed$)).subscribe((timecode) => {
        this._timecodeContainer.innerText = timecode;
      });
    }
  }
}

customElements.define('timecode-display', TimecodeDisplay);
