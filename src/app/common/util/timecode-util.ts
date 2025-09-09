import {TimecodeObject} from '@byomakase/omakase-player';

export class TimecodeUtil {
  public static timecodeObjectToSeconds(timecodeObject: TimecodeObject, frameRate: number) {
    return timecodeObject.hours * 3600 + timecodeObject.minutes * 60 + timecodeObject.seconds + timecodeObject.frames / frameRate;
  }
}
