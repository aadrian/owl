# 🦉 Miscellaneous 🦉 

## Content

- [AsyncRoot](#asyncroot)
- [Portal](#portal)

## `AsyncRoot`

When this component is used, a new rendering sub tree is created, such that the
rendering of that component (and its children) is not tied to the rendering of
the rest of the interface. It can be used on an asynchronous component, to
prevent it from delaying the rendering of the whole interface, or on a
synchronous one, such that its rendering isn't delayed by other (asynchronous)
components. Note that this directive has no effect on the first rendering, but
only on subsequent ones (triggered by state or props changes).

```xml
<div t-name="ParentComponent">
  <SyncChild />
  <AsyncRoot>
     <AsyncChild/>
  </AsyncRoot>
</div>
```

The `AsyncRoot` assumes that there is exactly one root node inside it. It can
be a dom node or a component.

## `Portal`

### Overview

The component `Portal` is meant to be used as a transparent way to 'teleport' a piece
of DOM to the node represented by its sole `target` props.

This component aims at helping the implementation of the needed infrastructure
for modals (as in bootstrap-modal).

### Usage

The content it will teleport is defined within the `<Portal>` node and
internally uses the `default` [Slot](component.md#slots).

This slot only contains **one** node, which in turn can have as many children as necessary.

The element under which the content will be teleported is represented as a selector
by the `target` props which only accepts a string as its value.

The `target` props only supports static selector, and is not meant to be passed to `Portal`
as a variable. Namely, `<Portal target="'body'" />` is the intended use.
By contrast, `<Portal target="state.target" />` is not supported.

The component `Portal` has no particular state, rather it is meant to be a slave to its parent,
and ultimately just a way for the parent to teleport a piece of its own DOM elsewhere.

### Example

The canonic use-case is to implement a Dialog, where a Component may choose to break the natural
workflow to help the user put in some data, which it could use later on.

```xml
<div t-name="TeleportedComponent">
    <span>I will move soon enough</span>
</div>

<div t-name="SomeComponent">
    <span>I am like the rest of us</span>
    <Portal target="'body'" t-if="state.dialog">
        <TeleportedComponent />
    </Portal>
</div>
```
In this example, the `Portal` component when activated by the use of `SomeComponent`'s state
will teleport the `TeleportedComponent`'s `div` as a child of the `body`.
`TeleportedComponent` is acting as a Dialog here.

The resulting DOM will look like:

```xml
<body>
    <div>
        <span>I am like the rest of us</span>
        <portal></portal>
    </div>
    <div>
        <span>I will move soon enough</span>
    </div>
</body>
```

### Expected Behaviors

The teleported piece is updated as any other `Component`'s DOM and in the same sequence.
Namely the teleported piece will be updated in function of its parents components, and patched as
a normal child.

The events triggered by a child component will be stopped to not bubble outside of the `target`.
They will, on the other hand, be re-directed onto the `Portal`'s root node and bubble up the DOM
as if it were triggered by a regular child Component.

Pure DOM events do not follow this pattern and are free to bubble their natural, unaltered way
up to the `body`.
