import { Component } from "../component/component";
import { VNode , patch } from "../vdom/index";
import { xml } from "../tags";
import { QWeb } from "../qweb/index";

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

  // The target where we will move `portal`
  target: HTMLElement | null = null;
  // Represents the element that is moved somewhere else
  portal: VNode | null = null;
  // A reference to the node before a patch
  _previousPortalElm: Node | null = null;
  // A function that will be the event's tunnel
  // This needs to be an arrow function to avoid having to rebind `this`
  _handlerTunnel: (f: Event) => void = (ev: Event) => {
    if (ev instanceof CustomEvent) {
      const mappedEvent = new (ev.constructor as any)(ev.type, ev);
      ev.stopPropagation();
      this.el!.dispatchEvent(mappedEvent);
    }
   };

  _deployPortal() {
    const portalElm = this.portal!.elm!;
    this.target!.appendChild(portalElm);
    const owlChildren = Object.values(this.__owl__.children);
    owlChildren.length && owlChildren[0].__callMounted();
  }

  __patch(vnode) {
    this._sanityChecks(vnode);
    const target = this.portal || document.createElement(vnode.sel!)
    this.portal = patch(target!, vnode.children![0] as VNode);
    vnode.children = [];
    this._makeEventHandling();
    super.__patch(vnode);
  }

  __callMounted() {
    const vnode = this.__owl__.vnode!;
    this._sanityChecks(vnode);
    this.portal = vnode.children![0] as VNode;
    vnode.children = [];
    this._deployPortal();
    this._makeEventHandling();
    super.__callMounted();
  }

  __destroy(parent) {
    if (this.portal) {
      const displacedElm = this.portal.elm!;
      const parent = displacedElm.parentNode;
      parent && parent.removeChild(displacedElm);
    }
    super.__destroy(parent);
  }

  _bindPortalEvents() {
    for (let evName of QWeb.eventNamesRegistry) {
      this.portal!.elm!.addEventListener(evName, this._handlerTunnel as EventListener);
    }
  }

  _unBindPortalEvents() {
    if (!this._previousPortalElm) {
      return;
    }
    for (let evName of QWeb.eventNamesRegistry) {
      this._previousPortalElm.removeEventListener(evName, this._handlerTunnel as EventListener);
    }
  }

  _sanityChecks(vnode: VNode) {
    const children = vnode.children!;
    let countRealNodes = 0;
    for (let child of children) {
      if ((child as VNode).sel)
        countRealNodes++;
    }
    if (countRealNodes !== 1) {
      throw new Error(`Portal must have exactly one non-text child (has ${countRealNodes})`);
    }
    this.target = document.querySelector(this.props.target);
    if (!this.target) {
      throw new Error(`Could not find any match for "${this.props.target}"`);
    }
  }

  _makeEventHandling() {
    const portalElm = this.portal!.elm!;
    if (!this._previousPortalElm || this._previousPortalElm !== portalElm) {
      this._unBindPortalEvents();
      this._bindPortalEvents();
      this._previousPortalElm = portalElm;
    }
  }
}
