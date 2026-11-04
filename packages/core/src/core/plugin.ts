import type {
  AnyPlugin,
  PluginFactory,
  PluginInstance,
  PluginSpec,
} from "./types";

/**
 * Declares a plugin. Calling the result creates an instance for `plugins`, and
 * the factory itself is the typed key for `useVideoState` and `useCommands`.
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
    spec: create(...options),
  });
  return Object.assign(factory, { pluginName: name });
}

/** Orders plugins so dependencies run first, keeping the given order otherwise. */
export function sortPlugins(plugins: readonly AnyPlugin[]): AnyPlugin[] {
  const byName = new Map<string, AnyPlugin>();
  for (const plugin of plugins) {
    if (byName.has(plugin.name)) {
      throw new Error(`react-video-kit: plugin "${plugin.name}" is installed twice.`);
    }
    byName.set(plugin.name, plugin);
  }

  const sorted: AnyPlugin[] = [];
  const visited = new Set<string>();
  const visiting: string[] = [];

  const visit = (plugin: AnyPlugin) => {
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
