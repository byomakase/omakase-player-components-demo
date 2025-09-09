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

/**
 * Typescript component used to emulate physical knob found on various audio equipment.
 *
 * Observed Attributes:
 * - `min` - Minimal possible value
 * - `max` - Maximal possible value
 * - `min-angle` - Angle at which minimal value is achieved
 * - `max-angle` - Angle at which maximal value is achieved
 * - `value` - Current value, Angle is calculated based on it
 * - `rotation-speed - Constant that control knob speed on vertical drag
 * - `radius` - knob radius in pixels
 * - `max-tick-count` - number of ticks around knob
 */
class KnobControl extends HTMLElement {
  private value: number = 0;
  private min: number = 0;
  private max: number = 100;
  private minAngle: number = -135;
  private maxAngle: number = 135;
  private isDragging: boolean = false;
  private currentDeg: number = 0;
  private onValueChangeCallback?: (value: number) => void;
  private lastLinearPos: number = 0;
  private radius: number = 35;
  private maxTickCount = 20;
  private rotationSpeed = 1;

  private knobElement!: HTMLElement;

  constructor() {
    super();
    this.startDrag = this.startDrag.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.stopDrag = this.stopDrag.bind(this);
    this.onScroll = this.onScroll.bind(this);
  }

  connectedCallback() {
    this.min = Number(this.getAttribute('min') ?? 0);
    this.max = Number(this.getAttribute('max') ?? 100);
    this.minAngle = Number(this.getAttribute('min-angle') ?? -135);
    this.maxAngle = Number(this.getAttribute('max-angle') ?? 135);
    this.radius = Number(this.getAttribute('radius') ?? 35);
    this.maxTickCount = Number(this.getAttribute('max-tick-count') ?? 20);
    this.rotationSpeed = Number(this.getAttribute('rotation-speed') ?? 1);

    this.render();
    this.renderTicks();

    const initial = this.getAttribute('value');
    if (initial !== null) {
      this.setValue(Number(initial));
    }
  }

  /**
   * Attaches all required listeners to document and knob element
   */
  private attachListeners() {
    this.knobElement.addEventListener('mousedown', this.startDrag);
    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.stopDrag);
    this.knobElement.addEventListener('wheel', this.onScroll.bind(this));
  }

  /**
   * Appends the ticks to DOM
   */
  private renderTicks() {
    const ticksContainer = this.querySelector('.ticks');
    if (!ticksContainer) return;

    ticksContainer.innerHTML = '';

    const knobRadius = this.radius;
    const tickOffset = 5;
    const center = knobRadius + tickOffset;
    const radius = knobRadius + tickOffset;

    const min = (this.minAngle + 360) % 360;
    const max = (this.maxAngle + 360) % 360;

    const range = min <= max ? max - min : 360 - (min - max);

    const count = Math.max(Math.floor((this.maxTickCount * range) / 360), 2);

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      const angle = (min + t * range + 270) % 360; // css views 0 angle as y axis, 270 degrees aligns these two

      const rad = (angle * Math.PI) / 180;
      const x = center + radius * Math.cos(rad);
      const y = center + radius * Math.sin(rad);

      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.left = `${x}px`;
      tick.style.top = `${y}px`;
      tick.style.transform = `translate(-50%, -100%) rotate(${angle - 90}deg)`;

      ticksContainer.appendChild(tick);
    }
  }

  disconnectedCallback() {
    this.knobElement.removeEventListener('mousedown', this.startDrag);
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    this.knobElement.removeEventListener('wheel', this.onScroll.bind(this));
  }

  static get observedAttributes() {
    return ['min', 'max', 'min-angle', 'max-angle', 'value', 'radius', 'max-tick-count', 'rotation-speed'];
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;
    switch (name) {
      case 'min':
        this.min = Number(newValue);
        break;
      case 'max':
        this.max = Number(newValue);
        break;
      case 'min-angle':
        this.minAngle = Number(newValue);
        this.renderTicks();
        break;
      case 'max-angle':
        this.maxAngle = Number(newValue);
        this.renderTicks();
        break;
      case 'value':
        this.value = Number(newValue);
        break;
      case 'max-tick-count':
        this.maxTickCount = Number(newValue);
        this.renderTicks();
        break;
      case 'rotation-speed':
        this.rotationSpeed = Number(newValue);
        break;
      case 'radius':
        this.radius = Number(newValue);
        this.render();
        this.renderTicks();
        return;
    }
    this.setValue(this.value);
  }

  /**
   * Used to set new value of the knob. It won't trigger a total component rerender.
   * It will only update knob rotation.
   *
   * @param {number} value - New value to be set
   */
  setValue(value: number) {
    value = Math.max(this.min, Math.min(this.max, value));
    const percent = (value - this.min) / (this.max - this.min);
    const deg = this.minAngle + percent * (this.maxAngle - this.minAngle);
    this.currentDeg = deg;
    this.value = value;
    if (this.knobElement) {
      this.knobElement.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
    }

    this.dispatchEvent(new CustomEvent('input', {detail: this.value}));
    this.onValueChangeCallback?.(this.value);
  }

  set onValueChange(callback: (value: number) => void) {
    this.onValueChangeCallback = callback;
  }

  /**
   * Renders the whole component to DOM. It does not take value into the account
   */
  private render() {
    const fullSize = this.radius * 2 + 10;

    this.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        .knob-container {
          width: ${fullSize}px;
          height: ${fullSize}px;
          position: relative;
          user-select: none;
          cursor: grab;
        }
        .knob {
          width: ${this.radius * 2}px;
          height: ${this.radius * 2}px;
          border-radius: 50%;
          border: 1px solid #662d91;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(0deg);
          transition: transform 0.05s linear;
          z-index: 2;
        }
  
        .ticks {
          position: absolute;
          width: ${fullSize}px;
          height: ${fullSize}px;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 1;
        }
  
        .tick {
          position: absolute;
          width: 2px;
          height: 10px;
          background: #662d91;
          transform-origin: bottom center;
        }
  
        .dot {
          width: 10px;
          height: 10px;
          background: #662d91;
          border-radius: 50%;
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
        }
      </style>
      <div class="knob-container">
        <div class="ticks"></div>
        <div class="knob">
          <div class="dot"></div>
        </div>
      </div>
    `;

    this.knobElement = this.querySelector('.knob')!;
    this.attachListeners();
  }

  private startDrag(event: MouseEvent) {
    event.preventDefault();
    this.isDragging = true;
    this.lastLinearPos = event.clientY;
  }

  private stopDrag() {
    this.isDragging = false;
  }

  /**
   * Calculates new value based on current vertical displacement from initial drag position
   *
   * @param {MouseEvent} event
   * @returns
   */
  private onDrag(event: MouseEvent) {
    if (!this.isDragging) return;

    const deltaY = this.lastLinearPos - event.clientY;
    this.lastLinearPos = event.clientY;

    let nextDeg = this.currentDeg + deltaY * 0.5 * this.rotationSpeed;
    nextDeg = Math.max(this.minAngle, Math.min(this.maxAngle, nextDeg));

    const percent = (nextDeg - this.minAngle) / (this.maxAngle - this.minAngle);
    this.setValue(this.min + percent * (this.max - this.min));
  }

  /**
   * Calculates new value based on mouse wheel scroll
   *
   * @param {WheelEvent} event
   */
  private onScroll(event: WheelEvent) {
    event.preventDefault();

    const delta = -event.deltaY;
    const step = (this.max - this.min) / 100;

    const valueDelta = step * Math.sign(delta);
    const newValue = Math.max(this.min, Math.min(this.max, this.value + valueDelta));

    this.setValue(newValue);
  }
}

customElements.define('knob-control', KnobControl);
