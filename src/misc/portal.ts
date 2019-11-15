import { Component } from "../component/component";
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
  static template = xml`<portal/>`;
  // TODO: props validation

  portal: HTMLElement | null = null;

  constructor(...args) {
    super(...args);
    console.warn(this.props);
  }

  __mount(fiber, elm) {
    const res = super.__mount(fiber, elm);
    this.portal = document.createElement('span');
    document.querySelector(this.props.target).appendChild(this.portal);
    return res;
  }

  __destroy(parent) {
    if (this.portal) {
        this.portal.remove();
    }
    super.__destroy(parent);
  }
}
