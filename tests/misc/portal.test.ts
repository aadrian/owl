import { Portal } from "../../src/misc/portal";
import { xml } from "../../src/tags";
import { makeTestFixture, makeTestEnv } from "../helpers";
import { Component } from "../../src/component/component";

//------------------------------------------------------------------------------
// Setup and helpers
//------------------------------------------------------------------------------

// We create before each test:
// - fixture: a div, appended to the DOM, intended to be the target of dom
//   manipulations.  Note that it is removed after each test.
// - a test env, necessary to create components, that is set on Component

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
  Component.env = makeTestEnv();
});

afterEach(() => {
  fixture.remove();
});

describe("Portal", () => {
  test("basic use of portal", async () => {
    // TODO: move this in beforeEach?
    const div = document.createElement('div')
    div.setAttribute('id', 'somewhere-else');
    fixture.appendChild(div);

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
});
