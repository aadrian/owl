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
  /*
   * DOM PLACEMENT
   */
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
    const consoleError = console.error;
    console.error = jest.fn(() => {});

    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <Portal target="'#outside'">
            <t t-esc="'only text'"/>
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
    expect(error.message).toBe('Portal must have exactly one non-text child (has 0)');
    expect(console.error).toBeCalledTimes(0);
    expect(fixture.innerHTML).toBe(`<div id="outside"></div>`);
    console.error = consoleError;
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
    expect(error.message).toBe('Portal must have exactly one non-text child (has 0)');
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
    expect(error.message).toBe('Portal must have exactly one non-text child (has 2)');
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
    expect(error.message).toBe('Portal must have exactly one non-text child (has 0)');

    expect(console.error).toBeCalledTimes(0);
    console.error = consoleError;
  });
  /*
   * EVENTS HANDLING
   */
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
    outside.querySelector('#trigger-me')!.dispatchEvent(new Event('custom'));
    await nextTick();
    expect(outside.innerHTML).toBe(`<span id="trigger-me">triggered</span>`);
  });

test("events triggered on movable owl components are redirected", async () => {
    let childInst: Component<any, any> | null = null;
    class Child extends Component<any, any> {
       static template = xml`
         <span t-on-custom="_onCustom" t-esc="props.val"/>`

        constructor(parent, props) {
          super(parent, props);
          childInst = this;
        }

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

    expect(outside.innerHTML).toBe(`<span>ab</span>`);
    childInst!.trigger('custom');
    await nextTick();
    expect(outside.innerHTML).toBe(`<span>triggered</span>`);
  });

test("events triggered on movable owl components are redirected", async () => {
    let childInst: Component<any, any> | null = null;
    class Child extends Component<any, any> {
       static template = xml`
         <span t-on-custom="_onCustom" t-esc="props.val"/>`

        constructor(parent, props) {
          super(parent, props);
          childInst = this;
        }

        _onCustom() {
          this.trigger('custom-portal');
        }
    }
    class Parent extends Component<any, any> {
      static components = { Portal, Child };
      static template = xml`
        <div t-on-custom-portal="_onCustomPortal">
          <Portal target="'#outside'">
            <div>
              <Child val="state.val"/>
            </div>
          </Portal>
        </div>`;
        state = useState({ val: 'ab'});

       _onCustomPortal() {
         this.state.val = 'triggered';
       }
      }
    const parent = new Parent();
    await parent.mount(fixture);

    expect(outside.innerHTML).toBe(`<div><span>ab</span></div>`);
    childInst!.trigger('custom');
    await nextTick();
    expect(outside.innerHTML).toBe(`<div><span>triggered</span></div>`);
  });

  test("Dom events are not mapped", async () => {
    let childInst: Component<any, any> | null = null;
    const steps: string[] = [];
    class Child extends Component<any, any> {
      static template = xml`
        <button>child</button>`;

      constructor(parent, props) {
          super(parent, props);
          childInst = this;
        }
    }
    class Parent extends Component<any, any> {
      static components = { Portal , Child };
      static template = xml`
        <div t-on-click="_handled">
          <Portal target="'#outside'">
            <Child />
          </Portal>
        </div>`;

      _handled(ev) {
        steps.push(ev.type as string);
      }
    }
    document.body.addEventListener('click', (ev) => {
      steps.push(`body: ${ev.type}`);
    });

    const parent = new Parent();
    await parent.mount(fixture);
    childInst!.el!.click();

    expect(steps).toEqual(['body: click']);
  });

  test("Nested portals event propagation", async () => {
    const outside2 = document.createElement("div");
    outside2.setAttribute("id", "outside2");
    fixture.appendChild(outside2);

    const steps: Array<string> = [];
    let childInst: Component<any, any> | null = null;
    class Child2 extends Component<any, any> {
      static template = xml`<div>child2</div>`;
      constructor(parent, props) {
          super(parent, props);
          childInst = this;
        }
    }
    class Child extends Component<any, any> {
      static components = { Portal , Child2 };
      static template = xml`
        <Portal target="'#outside2'">
          <Child2 />
        </Portal>`;
    }
    class Parent extends Component<any, any> {
      static components = { Portal , Child };
      static template = xml`
        <div t-on-custom='_handled'>
          <Portal target="'#outside'">
            <Child/>
          </Portal>
        </div>`;

      _handled(ev) {
        steps.push(ev.type as string);
      }
    }

    const parent = new Parent();
    await parent.mount(fixture);

    childInst!.trigger('custom');
    expect(steps).toEqual(['custom']);
  });
  /**
   * UI Stuff
   */
  test("focus is kept across re-renders", async () => {
    class Child extends Component<any, any> {
      static template = xml`
        <input id="target-me" t-att-placeholder="props.val"/>`;
    }
    class Parent extends Component<any, any> {
      static components = { Portal , Child };
      static template = xml`
        <div>
          <Portal target="'#outside'">
            <Child val="state.val"/>
          </Portal>
        </div>`;
        state = useState({ val: 'ab'});
      }
    const parent = new Parent();
    await parent.mount(fixture);
    const input = document.querySelector('#target-me');
    expect(input!.nodeName).toBe('INPUT');
    expect((input as HTMLInputElement).placeholder).toBe('ab');

    (input as HTMLInputElement).focus()
    expect(document.activeElement === input).toBeTruthy();

    parent.state.val = 'bc';
    await nextTick();
    const inputReRendered = document.querySelector('#target-me');
    expect(inputReRendered!.nodeName).toBe('INPUT');
    expect((inputReRendered as HTMLInputElement).placeholder).toBe('bc');
    expect(document.activeElement === inputReRendered).toBeTruthy();
  });
});
