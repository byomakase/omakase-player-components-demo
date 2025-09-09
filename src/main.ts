/// <reference types="@angular/localize" />

import './app/common/controls/knob/knob';
import './app/common/timecode-display/timecode-display';
import {bootstrapApplication} from '@angular/platform-browser';
import {appConfig} from './app/app.config';
import {AppComponent} from './app/app.component';
import '@angular/localize/init';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
