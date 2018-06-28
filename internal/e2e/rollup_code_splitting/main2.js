import {fn} from './dep2.js';
import {default as treeshaked, fn as fn2} from './dep3.js';

if (false) {
  treeshaked();
}

export default class Main2 {
  constructor() {
    fn2();
    fn();
  }
}