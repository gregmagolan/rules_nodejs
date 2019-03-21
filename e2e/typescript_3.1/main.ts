<<<<<<< HEAD
<<<<<<< HEAD
export function test() {
  return 'test';
=======
import {sayDate} from './lib';

console.log(sayDate());

export function test() {
  return `test ${sayDate()}`;
>>>>>>> 93ad8f5... Fix e2e test.
=======
import {sayFive} from './lib';

console.log(sayFive());

export function test() {
  return `test ${sayFive()}`;
>>>>>>> 5e66400... Format.
}