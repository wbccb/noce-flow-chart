import {
  debounce, isEqual, last, cloneDeep,
} from 'lodash-es';
import {deepObserve} from 'mobx-utils';
import EventEmitter from '../event/eventEmitter';
import {EventType} from '../constant/constant';

class History {

  eventCenter: EventEmitter;


  constructor(eventCenter: EventEmitter) {
    this.eventCenter = eventCenter;
  }
}


export default History;
export {History};