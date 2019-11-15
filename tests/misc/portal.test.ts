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
// - fixture has a child div with id #somewhere-else meant to be used as
//   target by Portal component
// - a test env, necessary to create components, that is set on Component

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
  const div = document.createElement("div");
  div.setAttribute("id", "somewhere-else");
  fixture.appendChild(div);

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
          <span>in parent</span>
          <Portal target="'#somewhere-else'">
            <span>somewhere else</span>
          </Portal>
        </div>`;
    }

    const parent = new Parent();
    await parent.mount(fixture);

    expect(fixture.innerHTML).toMatchSnapshot();
  });

  test("conditional use of Portal", async () => {
    class Parent extends Component<any, any> {
      static components = { Portal };
      static template = xml`
        <div>
          <span>in parent</span>
          <Portal target="'#somewhere-else'" t-if="state.hasPortal">
            <span>somewhere else</span>
          </Portal>
        </div>`;

      state = useState({ hasPortal: false });
    }


    const parent = new Parent();
    await parent.mount(fixture);

    expect(fixture.innerHTML).toMatchSnapshot();
    parent.state.hasPortal = true;
    await nextTick();
    expect(fixture.innerHTML).toMatchSnapshot();
  });


});
