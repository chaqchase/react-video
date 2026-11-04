// Compile-time checks for plugin inference. `pnpm typecheck` is what enforces them.
import { describe, expectTypeOf, it } from "vitest";
import { definePlugin } from "../../src/core/plugin";
import { createPlayer } from "../../src/core/player";
import type { CommandsOf, CoreCommands, StateOf } from "../../src/core/types";
import { useCommands, useVideoState } from "../../src/react/hooks";

const quality = definePlugin("quality", (options: { auto?: boolean } = {}) => ({
  state: () => ({ auto: options.auto ?? true, level: null as string | null }),
  attrs: { "data-auto": (state) => state.auto },
  commands: (context) => ({
    select(id: string) {
      expectTypeOf(context.state().auto).toEqualTypeOf<boolean>();
      context.set({ level: id });
    },
  }),
  setup(context) {
    expectTypeOf(context.state().level).toEqualTypeOf<string | null>();
  },
  gates: {
    play: (_request, next, context) => {
      expectTypeOf(context.state().auto).toEqualTypeOf<boolean>();
      return next();
    },
  },
}));

const bare = definePlugin("bare", () => ({}));

describe("plugin types", () => {
  it("infers state and commands from the factory", () => {
    expectTypeOf<StateOf<typeof quality>>().toEqualTypeOf<{
      auto: boolean;
      level: string | null;
    }>();
    expectTypeOf<CommandsOf<typeof quality>>().toEqualTypeOf<{
      select(id: string): void;
    }>();
    expectTypeOf(quality.pluginName).toEqualTypeOf<"quality">();
  });

  it("accepts mixed plugins with no casts", () => {
    createPlayer({ plugins: [quality({ auto: false }), bare()] });
  });

  it("types plugin access on the player", () => {
    const handle = createPlayer({ plugins: [quality()] }).plugin(quality);
    expectTypeOf(handle.state().level).toEqualTypeOf<string | null>();
    expectTypeOf(handle.commands.select).parameter(0).toBeString();
  });

  it("types the hooks", () => {
    // Types only: these hooks need a Root to run.
    const useChecks = () => {
      expectTypeOf(useVideoState((media) => media.paused)).toEqualTypeOf<boolean>();
      expectTypeOf(useVideoState(quality, (state) => state.auto)).toEqualTypeOf<boolean>();
      expectTypeOf(
        useVideoState(quality, (state, media) => [state.level, media.duration] as const)
      ).toEqualTypeOf<readonly [string | null, number]>();
      expectTypeOf(useCommands()).toEqualTypeOf<CoreCommands>();
      expectTypeOf(useCommands(quality).select).parameter(0).toBeString();
    };
    expectTypeOf(useChecks).toBeFunction();
  });

  it("rejects mistakes", () => {
    const useChecks = () => {
      // @ts-expect-error -- not a plugin in the state
      useVideoState(quality, (state) => state.missing);
      // @ts-expect-error -- not one of the plugin's commands
      useCommands(quality).missing();
      // @ts-expect-error -- a factory has to be called
      createPlayer({ plugins: [quality] });
      definePlugin("x", () => ({
        state: () => ({ a: 1 }),
        // @ts-expect-error -- commands can only set declared state
        commands: (context) => ({ go: () => context.set({ b: 2 }) }),
      }));
    };
    expectTypeOf(useChecks).toBeFunction();
  });
});
