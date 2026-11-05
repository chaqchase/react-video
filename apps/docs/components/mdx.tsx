import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { Api, ApiEntry, PluginApi, PluginList, PluginSummary } from "@/components/docs/api";
import { Demo } from "@/components/docs/demo";
import { TokenEditor } from "@/components/docs/token-editor";
import { Install } from "@/components/site/install";

export function getMDXComponents(components?: MDXComponents) {
  // Code can scroll, so each block is a focusable region, and those need their own names.
  let codeSamples = 0;
  return {
    ...defaultMdxComponents,
    pre: (props: ComponentProps<typeof CodeBlock>) => {
      codeSamples += 1;
      return (
        <CodeBlock {...props} viewportProps={{ "aria-label": `Code sample ${codeSamples}` }}>
          <Pre>{props.children}</Pre>
        </CodeBlock>
      );
    },
    Api,
    ApiEntry,
    Demo,
    Install,
    PluginApi,
    PluginList,
    PluginSummary,
    Step,
    Steps,
    Tab,
    Tabs,
    TokenEditor,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;
