"use client";

import {
  Children,
  cloneElement,
  forwardRef,
  useCallback,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

type Props = Record<string, unknown>;

/**
 * Sliders are real range inputs for keyboards and screen readers, while pointers use
 * the visible track. This is behaviour rather than a skin, so even headless parts have it.
 */
export const HIDDEN_INPUT = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  margin: 0,
  opacity: 0,
  pointerEvents: "none",
} as const;

function assign<Value>(ref: Ref<Value> | undefined, value: Value | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: Value | null }).current = value;
}

/** Forwards a node to several refs. */
export function mergeRefs<Value>(...refs: (Ref<Value> | undefined)[]) {
  return (node: Value | null) => {
    for (const ref of refs) assign(ref, node);
  };
}

// React 19 moved ref into props, and each version warns on reading the other's.
function refOf(element: ReactElement): Ref<unknown> | undefined {
  const props = element.props as Props;
  const getter = Object.getOwnPropertyDescriptor(props, "ref")?.get;
  if (getter && "isReactWarning" in getter) {
    return (element as unknown as { ref?: Ref<unknown> }).ref;
  }
  const legacy = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  if (legacy && "isReactWarning" in legacy) return props.ref as Ref<unknown>;
  return (props.ref ?? (element as unknown as { ref?: Ref<unknown> }).ref) as
    | Ref<unknown>
    | undefined;
}

function mergeProps(part: Props, child: Props): Props {
  const merged = { ...part, ...child };
  for (const key in child) {
    const a = part[key];
    const b = child[key];
    if (/^on[A-Z]/.test(key) && typeof a === "function" && typeof b === "function") {
      merged[key] = (...args: unknown[]) => {
        b(...args);
        a(...args);
      };
    } else if (key === "className") {
      merged[key] = [a, b].filter(Boolean).join(" ");
    } else if (key === "style") {
      merged[key] = { ...(a as object), ...(b as object) };
    }
  }
  return merged;
}

/** A stable ref callback, for parts that hand their nodes to a controller. */
export function useNodeRef<Value>(set: (node: Value | null) => void) {
  return useCallback((node: Value | null) => set(node), [set]);
}

/** Renders the single child with a part's behaviour, instead of the part's element. */
export const AsChild = forwardRef<unknown, Props & { children?: ReactNode }>(
  function AsChild({ children, ...props }, ref) {
    const child = Children.only(children) as ReactElement<Props>;
    return cloneElement(child, {
      ...mergeProps(props, child.props),
      ref: mergeRefs(ref, refOf(child)),
    } as Props);
  }
);
