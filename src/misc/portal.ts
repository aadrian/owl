import { Component } from "../component/component";
import { VNode , patch } from "../vdom/index";
import { xml } from "../tags";
import { OwlEvent } from "../core/owl_event";
import { useSubEnv } from "../hooks";
import { portalSymbol } from "./index";

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
  // A function that will be the event's tunnel
  // This needs to be an arrow function to avoid having to rebind `this`
  _handlerTunnel: (f: OwlEvent<any>) => void = (ev: OwlEvent<any>) => {
    ev.stopPropagation();
    this.__trigger(ev.originalComponent, ev.type, ev.detail);
   };
  // A Set of encountered event that need to be redirected
  _handledEvents: Set<string> = new Set();

  constructor(parent, props) {
    super(parent, props);
    useSubEnv({});
    this.env[portalSymbol] = (ev) => {
      if (!this._handledEvents.has(ev.type)) {
        this.portal!.elm!.addEventListener(ev.type, this._handlerTunnel);
        this._handledEvents.add(ev.type);
      }
    }
  }

  _deployPortal() {
    const portalElm = this.portal!.elm!;
    this.target!.appendChild(portalElm);
    const owlChildren = Object.values(this.__owl__.children);
    for (let child of owlChildren) {
      child.__callMounted();
    }
  }

  __patch(vnode) {
    this._sanityChecks(vnode);
    const target = this.portal || document.createElement(vnode.sel!)
    this.portal = patch(target!, vnode.children![0] as VNode);
    vnode.children = [];
    super.__patch(vnode);
  }

  __callMounted() {
    const vnode = this.__owl__.vnode!;
    this._sanityChecks(vnode);
    this.portal = vnode.children![0] as VNode;
    vnode.children = [];
    this._deployPortal();
    super.__callMounted();
  }

  __destroy(parent) {
    if (this.portal) {
      const displacedElm = this.portal.elm!;
      const parent = displacedElm.parentNode;
      if (parent) {
        parent.removeChild(displacedElm);
      }
    }
    super.__destroy(parent);
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
}
