import { Component } from "../component/component";
import { patch, VNode } from "../vdom/index";
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

  async __moveToPortal(fiber) {
    this.portal = (fiber.vnode!.children![0] as VNode);
    fiber.vnode!.children = [];
    await Promise.resolve();
    this.target = document.querySelector(this.props.target);
    if (this.target) {
      const fakeNode = document.createElement('fake');
      this.target.appendChild(fakeNode);
      patch(fakeNode, this.portal!);
    }
  }

  __patch(vnode) {
    this.__moveToPortal(this.__owl__.currentFiber);
    super.__patch(vnode);
  }
  __mount(fiber, elm) {
    this.__moveToPortal(fiber);
    const res = super.__mount(fiber, elm);
    return res;
  }
  __destroy(parent) {
    if (this.target) {
        document.querySelector(this.props.target).removeChild(this.portal!.elm!);
    }
    super.__destroy(parent);
  }
}
