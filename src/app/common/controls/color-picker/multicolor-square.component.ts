import {Component, computed, input, output} from '@angular/core';
import {ColorUtil} from '../../util/color-util';
import {IconDirective} from '../../icon/icon.directive';

@Component({
  selector: 'app-multicolor-square',
  imports: [IconDirective],
  template: `
    <div class="square">
      @for(color of colors(); track color) {
      <div class="subsquare" [style.backgroundColor]="color"></div>
      }
    </div>
    @if (active()) {
    <i appIcon="checkbox-checked" [style]="{color: checkboxColor()}"></i>
    }
  `,
})
export class ColorSquareComponent {
  colors = input.required<string[]>();
  active = input<boolean>(false);
  click = output<void>();

  checkboxColor = computed(() => {
    const contrastingColors = this.colors().map((color) => ColorUtil.getContrastingTextColor(color));
    const whiteContrastingColorNumber = contrastingColors.filter((color) => color === '#ffffff').length;

    return whiteContrastingColorNumber > 2 ? '#ffffff' : '#000000';
  });
}
