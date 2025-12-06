import { Menu, type MenuGroup, type MenuOptions } from './menu';
import { Gestures, type GestureOptions } from './gestures';
import { Player } from '../player';

export class APMenuElement extends HTMLElement {
  menu?: Menu;
  init(root: HTMLElement, groups: MenuGroup[], options?: MenuOptions) {
    this.menu = new Menu(root, groups, options);
    return this.menu;
  }
  open() { this.menu?.open(); }
  close() { this.menu?.close(); }
  toggle() { this.menu?.toggle(); }
  setGroups(groups: MenuGroup[]) { this.menu?.setGroups(groups); }
}

export class APGesturesElement extends HTMLElement {
  gestures?: Gestures;
  init(root: HTMLElement, player: Player, options?: GestureOptions) {
    this.gestures = new Gestures(root, player, options);
    return this.gestures;
  }
}

customElements.define('ap-menu', APMenuElement);
customElements.define('ap-gestures', APGesturesElement);