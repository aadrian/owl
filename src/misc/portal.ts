import { Component } from "../component/component";
import { VNode } from "../vdom/index";
import { xml } from "../tags";

/**
 * Portal
 *
 * The Portal component allows to render a part of a component outside it's DOM.
 * It is for example useful for dialogs: for css reasons, dialogs are in general
 * placed in a specific spot of the DOM (e.g. directly in the body). With the
 * Portal, a component can conditionally specify in its tempate that it contains
 * a dialog, and where this dialog should be inserted in the DOM.
 *
 * The Portal component ensures that the communication between the content of
 * the Portal and its parent properly works: events reaching the Portal are
 * re-triggered on an empty <portal> node located in the parent's DOM.
 */

export class Portal extends Component<any, any> {
  static template = xml`<portal><t t-slot="default"/></portal>`;
  // TODO: props validation

  portal: VNode | null = null;
  target: HTMLElement | null = null;

  __callMounted() {
    console.warn('__callMounted', this.constructor.name);
    const vnode = this.__owl__.vnode;
    this.portal = (vnode!.children![0] as VNode);
    // vnode!.children = [];
    super.__callMounted();
    this.target = document.querySelector(this.props.target);
    console.warn('target', this.target);
    if (!this.target) {
      console.warn('NO target');
      throw new Error(`Could not find any match for "${this.props.target}"`);
    } else {
      this.target.appendChild(((this.el as any).firstElementChild as any));
    }
  }

  __destroy(parent) {
    console.warn('__destroy', this.constructor.name);
    if (this.target) {
        document.querySelector(this.props.target).removeChild(this.portal!.elm!);
    }
    super.__destroy(parent);
  }
}
