import type {
  AnyPlugin,
  PluginFactory,
  PluginInstance,
  PluginSpec,
} from "./types";

/**
 * Declares a plugin. Calling the result creates an instance for `plugins`, and
 * the factory itself is the typed key for `useVideoState` and `useCommands`.
 * `create` runs once for each player, so it can hold that player's private state.
 */
export function definePlugin<
  Name extends string,
  Options extends unknown[],
  State extends object = Record<never, never>,
  Commands extends object = Record<never, never>,
>(
  name: Name,
  create: (...options: Options) => PluginSpec<State, Commands>
): PluginFactory<Name, Options, State, Commands> {
  const factory = (...options: Options): PluginInstance<Name, State, Commands> => ({
    name,
    // Once per player, so what `create` closes over never crosses between players.
    create: () => create(...options),
  });
  return Object.assign(factory, { pluginName: name });
}

interface ResolvedPlugin {
  name: string;
  spec: PluginSpec<object, object>;
}

/** Orders plugins so dependencies run first, keeping the given order otherwise. */
export function sortPlugins(instances: readonly AnyPlugin[]): ResolvedPlugin[] {
  const byName = new Map<string, ResolvedPlugin>();
  const plugins = instances.map(({ name, create }) => {
    if (byName.has(name)) {
      throw new Error(`react-video-kit: plugin "${name}" is installed twice.`);
    }
    const plugin = { name, spec: create() };
    byName.set(name, plugin);
    return plugin;
  });

  const sorted: ResolvedPlugin[] = [];
  const visited = new Set<string>();
  const visiting: string[] = [];

  const visit = (plugin: ResolvedPlugin) => {
    if (visited.has(plugin.name)) return;
    if (visiting.includes(plugin.name)) {
      const cycle = [...visiting, plugin.name].join(" -> ");
      throw new Error(`react-video-kit: plugin dependency cycle: ${cycle}.`);
    }
    visiting.push(plugin.name);

    for (const required of plugin.spec.requires ?? []) {
      const dependency = byName.get(required);
      if (!dependency) {
        throw new Error(
          `react-video-kit: plugin "${plugin.name}" requires "${required}", which isn't installed.`
        );
      }
      visit(dependency);
    }
    for (const earlier of plugin.spec.after ?? []) {
      const dependency = byName.get(earlier);
      if (dependency) visit(dependency);
    }

    visiting.pop();
    visited.add(plugin.name);
    sorted.push(plugin);
  };

  for (const plugin of plugins) visit(plugin);
  return sorted;
}
