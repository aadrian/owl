import { Portal } from "../../src/misc/portal";
import { xml } from "../../src/tags";
import { makeTestFixture, makeTestEnv, nextTick } from "../helpers";
import { Component } from "../../src/component/component";
import { useState } from "../../src/hooks";

//------------------------------------------------------------------------------
// Setup and helpers
//------------------------------------------------------------------------------

// We create before each test:
// - fixture: a div, appended to the DOM, intended to be the target of dom
//   manipulations.  Note that it is removed after each test.
// - outside: a div with id #outside appended into fixture, meant to be used as
//   target by Portal component
// - a test env, necessary to create components, that is set on Component

let fixture: HTMLElement;
let outside: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
  outside = document.createElement("div");
  outside.setAttribute("id", "outside");
  fixture.appendChild(outside);

  Component.env = makeTestEnv();
});

afterEach(() => {
  fixture.remove();
});

describe("Portal", () => {
  test("basic use of portal", async () => {
    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <span>1</span>
          <Portal target="'#outside'">
            <div>2</div>
          </Portal>
        </div>`;
    }

    const parent = new Parent();
    await parent.mount(fixture);

    expect(outside.innerHTML).toBe('<div>2</div>');
    expect(parent.el!.outerHTML).toBe('<div><span>1</span><portal></portal></div>');
  });

  test("conditional use of Portal", async () => {
    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <span>1</span>
          <Portal target="'#outside'" t-if="state.hasPortal">
            <div>2</div>
          </Portal>
        </div>`;

      state = useState({ hasPortal: false });
    }

    const parent = new Parent();
    await parent.mount(fixture);
    expect(outside.innerHTML).toBe('');
    expect(parent.el!.outerHTML).toBe('<div><span>1</span></div>');

    parent.state.hasPortal = true;
    await nextTick();
    expect(outside.innerHTML).toBe('<div>2</div>');
    expect(parent.el!.outerHTML).toBe('<div><span>1</span><portal></portal></div>');

    parent.state.hasPortal = false;
    await nextTick();
    expect(outside.innerHTML).toBe('');
    expect(parent.el!.outerHTML).toBe('<div><span>1</span></div>');

    parent.state.hasPortal = true;
    await nextTick();
    expect(outside.innerHTML).toBe('<div>2</div>');
    expect(parent.el!.outerHTML).toBe('<div><span>1</span><portal></portal></div>');
  });

  test("with target in template (not yet in DOM)", async () => {
    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <div id="local-target"></div>
          <span>1</span>
          <Portal target="'#local-target'">
            <p>2</p>
          </Portal>
        </div>`;
    }

    const parent = new Parent();
    await parent.mount(fixture);
    expect(parent.el!.innerHTML).toBe('<div id="local-target"><p>2</p></div><span>1</span><portal></portal>');
  });

  test("portal with target not in dom", async () => {
    const consoleError = console.error;
    console.error = jest.fn(() => {});

    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <Portal target="'#does-not-exist'">
            <div>2</div>
          </Portal>
        </div>`;
    }

    const parent = new Parent();
    let error;
    try {
      await parent.mount(fixture);
    } catch (e) {
       error = e;
    }

    expect(error).toBeDefined();
    expect(error.message).toBe('Could not find any match for "#does-not-exist"');
    expect(console.error).toBeCalledTimes(0);
    expect(fixture.innerHTML).toBe(`<div id="outside"></div>`);
    console.error = consoleError;
  });

  test("portal with child and props", async () => {
    const steps: string[] = [];
    class Child extends Component<any, any> {
      static template = xml`<span><t t-esc="props.val"/></span>`;
      mounted() {
        steps.push("mounted");
        expect(outside.innerHTML).toBe("<span>1</span>");
      }
      patched() {
        steps.push("patched");
        expect(outside.innerHTML).toBe("<span>2</span>");
      }
    }
    class Parent extends Component<any, any> {
      static components = { Portal, Child };
      static template = xml`
        <div>
          <Portal target="'#outside'">
            <Child val="state.val"/>
          </Portal>
        </div>`;
      state = useState({ val: 1 });
    }

    const parent = new Parent();
    await parent.mount(fixture);
    expect(outside.innerHTML).toBe("<span>1</span>");
    expect(parent.el!.innerHTML).toBe("<portal></portal>");

    parent.state.val = 2;
    await nextTick();
    expect(outside.innerHTML).toBe("<span>2</span>");
    expect(parent.el!.innerHTML).toBe("<portal></portal>");
    expect(steps).toEqual(["mounted", "patched"]);
  });

  test("portal with only text as content", async () => {
    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <Portal target="'#outside'">
            <t t-esc="state.val"/>
          </Portal>
        </div>`;
      state = useState({ val: 1 });
    }

    const parent = new Parent();
    await parent.mount(fixture);
    expect(outside.innerHTML).toBe('1');
    expect(parent.el!.innerHTML).toBe('<portal></portal>');

    parent.state.val = 2;
    await nextTick();
    expect(outside.innerHTML).toBe('2');
    expect(parent.el!.innerHTML).toBe('<portal></portal>');
  });

  test("portal with no content", async () => {
    const consoleError = console.error;
    console.error = jest.fn(() => {});

    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <Portal target="'#outside'">
            <t t-if="false" t-esc="'ABC'"/>
          </Portal>
        </div>`;
    }

    const parent = new Parent();
    let error;
    try {
      await parent.mount(fixture);
    } catch (e) {
       error = e;
    }
    expect(error).toBeDefined();
    expect(error.message).toBe('Portal must have exactly one child (has 0)');
    expect(console.error).toBeCalledTimes(0);
    expect(fixture.innerHTML).toBe(`<div id="outside"></div>`);
    console.error = consoleError;
  });

  test("portal with many children", async () => {
    const consoleError = console.error;
    console.error = jest.fn(() => {});

    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <Portal target="'#outside'">
            <div>1</div>
            <p>2</p>
          </Portal>
        </div>`;
    }
    const parent = new Parent();
    let error;
    try {
      await parent.mount(fixture);
    } catch (e) {
       error = e;
    }
    expect(error).toBeDefined();
    expect(error.message).toBe('Portal must have exactly one child (has 2)');
    expect(console.error).toBeCalledTimes(0);
    expect(fixture.innerHTML).toBe(`<div id="outside"></div>`);
    console.error = consoleError;
  });

  test("portal with dynamic body", async () => {
    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <Portal target="'#outside'">
            <span t-if="state.val" t-esc="state.val"/>
            <div t-else=""/>
          </Portal>
        </div>`;
        state = useState({ val: 'ab'});}

    const parent = new Parent();
    await parent.mount(fixture);

    expect(outside.innerHTML).toBe(`<span>ab</span>`);

    parent.state.val = '';
    await nextTick();
    expect(outside.innerHTML).toBe(`<div></div>`);
  });

test("portal could have dynamically no content", async () => {
    const consoleError = console.error;
    console.error = jest.fn(() => {});

    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <Portal target="'#outside'">
            <span t-if="state.val" t-esc="state.val"/>
          </Portal>
        </div>`;
        state = { val: 'ab'};
      }
    const parent = new Parent();
    await parent.mount(fixture);

    expect(outside.innerHTML).toBe(`<span>ab</span>`);

    let error;
    try {
      parent.state.val = '';
      await parent.render();
    } catch (e) {
       error = e;
    }
    expect(outside.innerHTML).toBe(``);

    expect(error).toBeDefined();
    expect(error.message).toBe('Portal must have exactly one child (has 0)');

    expect(console.error).toBeCalledTimes(0);
    console.error = consoleError;
  });

  test("events triggered on movable pure node are handled", async () => {
    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <Portal target="'#outside'">
            <span id="trigger-me" t-on-custom="_onCustom" t-esc="state.val"/>
          </Portal>
        </div>`;
        state = useState({ val: 'ab'});

        _onCustom() {
          this.state.val = 'triggered';
        }
      }
    const parent = new Parent();
    await parent.mount(fixture);

    expect(outside.innerHTML).toBe(`<span id="trigger-me">ab</span>`);
    const ev = new Event('custom');
    outside.querySelector('#trigger-me')!.dispatchEvent(ev);
    await nextTick();
    expect(outside.innerHTML).toBe(`<span id="trigger-me">triggered</span>`);
  });

// TO FIX
test("events triggered on movable owl components are redirected", async () => {
    class Child extends Component<any, any> {
       static template = xml`
         <span id="trigger-me" t-on-custom="_onCustom" t-esc="props.val"/>`

        _onCustom() {
          this.trigger('custom-portal');
        }
    }
    class Parent extends Component<any, any> {
      static components = { Portal, Child };
      static template = xml`
        <div t-on-custom-portal="_onCustomPortal">
          <Portal target="'#outside'">
            <Child val="state.val"/>
          </Portal>
        </div>`;
        state = useState({ val: 'ab'});

       _onCustomPortal() {
         this.state.val = 'triggered';
       }
      }
    const parent = new Parent();
    await parent.mount(fixture);

    expect(outside.innerHTML).toBe(`<span id="trigger-me">ab</span>`);
    const ev = new Event('custom');
    outside.querySelector('#trigger-me')!.dispatchEvent(ev);
    await nextTick();
    expect(outside.innerHTML).toBe(`<span id="trigger-me">triggered</span>`);
  });

  test("events triggered on movable pure node are redirected", async () => {
    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <Portal target="'#outside'" t-on-custom="_onCustom">
            <span id="trigger-me" t-esc="state.val"/>
          </Portal>
        </div>`;
        state = useState({ val: 'ab'});

        _onCustom() {
          this.state.val = 'triggered';
        }
      }
    const parent = new Parent();
    await parent.mount(fixture);

    expect(outside.innerHTML).toBe(`<span id="trigger-me">ab</span>`);
    const ev = new Event('custom');
    outside.querySelector('#trigger-me')!.dispatchEvent(ev);
    await nextTick();
    expect(outside.innerHTML).toBe(`<span id="trigger-me">triggered</span>`);
  });

  test("Handlers are re-affected on rerender", async () => {
    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <Portal target="'#outside'" t-on-custom="_onCustom(state.val)">
            <span t-if="state.val === 'ab'" id="trigger-me" t-esc="state.val"/>
            <div t-else="" id="trigger-me" t-esc="state.val" />
          </Portal>
        </div>`;
        state = useState({ val: 'ab'});

        _onCustom(val) {
          if (val === 'ab') {
            this.state.val = 'triggered';
          } else if (this.state.val === 'triggered' ) {
            this.state.val = 'second trigger';
          }
        }
      }
    const parent = new Parent();
    await parent.mount(fixture);

    expect(outside.innerHTML).toBe(`<span id="trigger-me">ab</span>`);

    let ev = new Event('custom');
    outside.querySelector('#trigger-me')!.dispatchEvent(ev);
    await nextTick();
    expect(outside.innerHTML).toBe(`<div id="trigger-me">triggered</div>`);

    ev = new Event('custom');
    outside.querySelector('#trigger-me')!.dispatchEvent(ev);
    await nextTick();
    expect(outside.innerHTML).toBe(`<div id="trigger-me">second trigger</div>`);
  });

  test("Handlers are correctly unbound when changed", async () => {
    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <Portal target="'#outside'" t-on-custom="_onCustom(state.val)">
            <span t-if="state.val === 'ab'" id="trigger-me" t-esc="state.val"/>
            <div t-else="" id="trigger-me" t-esc="state.val"/>
          </Portal>
        </div>`;
        state = useState({ val: 'ab'});

        _onCustom(val) {
          if (val === 'ab') {
            this.state.val = 'triggered';
          } else if (this.state.val === 'triggered' ) {
            this.state.val = 'second trigger';
          }
        }
      }
    const parent = new Parent();
    await parent.mount(fixture);

    expect(outside.innerHTML).toBe(`<span id="trigger-me">ab</span>`);

    let ev = new Event('custom');
    const formerOutside = outside.querySelector('#trigger-me');
    formerOutside!.dispatchEvent(ev);
    await nextTick();
    expect(outside.innerHTML).toBe(`<div id="trigger-me">triggered</div>`);

    const newOutside = outside.querySelector('#trigger-me');
    expect(formerOutside).toBeTruthy();
    expect(formerOutside !== newOutside).toBeTruthy();

    formerOutside!.dispatchEvent(new Event('custom'));
    await nextTick();
    expect(outside.innerHTML).toBe(`<div id="trigger-me">triggered</div>`);
  });
});
