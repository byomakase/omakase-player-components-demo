import {Component, ElementRef, Input, OnDestroy, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, input, effect} from '@angular/core';
import {Observable, Subscription} from 'rxjs';

@Component({
  selector: 'app-timecode-display',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<timecode-display></timecode-display>`,
})
export class TimecodeDisplay implements AfterViewInit, OnDestroy {
  timecode$ = input.required<Observable<string>>();

  private timecodeElement!: HTMLElement & {timecode$?: Observable<string>};
  private sub?: Subscription;

  constructor(private host: ElementRef) {
    effect(() => {
      if (this.timecodeElement) {
        (this.timecodeElement as any).timecode$ = this.timecode$();
      }
    });
  }

  ngAfterViewInit() {
    this.timecodeElement = this.host.nativeElement.querySelector('timecode-display');

    // Assign observable directly to the custom element
    (this.timecodeElement as any).timecode$ = this.timecode$();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
