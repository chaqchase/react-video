import { definePlugin } from "../../core/plugin";
import type { SourceObject } from "../../core/types";
import { clearKeyLicense, KEY_SYSTEMS, type DrmConfig, type KeySystemConfig } from "./config";

export type {
  ClearKeyConfig,
  DrmConfig,
  FairPlayConfig,
  KeySystemConfig,
} from "./config";

export type DrmOptions = DrmConfig | ((source: SourceObject) => DrmConfig | null);

type SystemName = keyof typeof KEY_SYSTEMS;

// The codecs here only check that a system works at all. The stream's own come later.
const CAPABILITIES: MediaKeySystemConfiguration[] = [
  {
    initDataTypes: ["cenc", "keyids", "sinf", "skd", "webm"],
    videoCapabilities: [
      { contentType: 'video/mp4; codecs="avc1.42E01E"' },
      { contentType: 'video/webm; codecs="vp9"' },
    ],
    audioCapabilities: [
      { contentType: 'audio/mp4; codecs="mp4a.40.2"' },
      { contentType: 'audio/webm; codecs="opus"' },
    ],
  },
];

const decoder = new TextDecoder();

async function requestLicense(system: KeySystemConfig, message: ArrayBuffer) {
  const response = await fetch(system.licenseUrl, {
    method: "POST",
    body: message,
    headers: system.headers,
    credentials: system.withCredentials ? "include" : "same-origin",
  });
  if (!response.ok) throw new Error(`The licence server returned ${response.status}.`);
  return response.arrayBuffer();
}

/**
 * Protected playback from one description. Engines handle their own key systems, and
 * this runs the same exchange for streams the browser plays directly, as FairPlay
 * does in Safari. The first system in the config that the browser supports is used.
 */
export const drm = definePlugin("drm", (options: DrmOptions) => ({
  state: () => ({ system: null as string | null }),
  gates: {
    load(request, next) {
      const config = typeof options === "function" ? options(request.source) : options;
      return next(config ? { ...request, drm: config } : request);
    },
  },
  attach(context, element, scope) {
    let config: DrmConfig | null = null;
    let ready: Promise<SystemName> | null = null;
    const seen = new Set<string>();

    const prepare = async (): Promise<SystemName> => {
      const available = (Object.keys(KEY_SYSTEMS) as SystemName[]).filter((name) => config?.[name]);
      for (const name of available) {
        try {
          const access = await navigator.requestMediaKeySystemAccess(
            KEY_SYSTEMS[name],
            CAPABILITIES
          );
          const keys = await access.createMediaKeys();
          if (name === "fairplay" && config?.fairplay) {
            const response = await fetch(config.fairplay.certificateUrl);
            await keys.setServerCertificate(await response.arrayBuffer());
          }
          await element.setMediaKeys(keys);
          context.set({ system: KEY_SYSTEMS[name] });
          return name;
        } catch {
          // On to the next system.
        }
      }
      throw new Error("This browser supports none of the configured key systems.");
    };

    const fail = (error: unknown) => {
      if (scope.signal.aborted) return;
      context.report({
        status: "error",
        waiting: false,
        error: {
          code: "drm",
          message: error instanceof Error ? error.message : String(error),
          fatal: true,
        },
      });
    };

    const onEncrypted = (event: MediaEncryptedEvent) => {
      // Engines read the same event and run their own sessions.
      const { provider, source } = context.media();
      if (provider !== "native" || !source || !event.initData) return;
      const resolved = typeof options === "function" ? options(source) : options;
      if (!resolved) return;
      config = resolved;

      const id = decoder.decode(event.initData);
      if (seen.has(id)) return;
      seen.add(id);

      ready ??= prepare();
      ready
        .then(async (name) => {
          const keys = element.mediaKeys;
          if (!keys || !event.initData) return;
          const session = keys.createSession();
          scope.add(() => void session.close().catch(() => {}));
          session.addEventListener("message", (message) => {
            const handle = async () => {
              if (name === "clearkey" && config?.clearkey) {
                const { kids } = JSON.parse(decoder.decode(message.message)) as { kids: string[] };
                const license = clearKeyLicense(config.clearkey.keys, kids);
                await session.update(new TextEncoder().encode(JSON.stringify(license)));
                return;
              }
              const system = config?.[name] as KeySystemConfig | undefined;
              if (!system) return;
              await session.update(await requestLicense(system, message.message));
            };
            handle().catch(fail);
          });
          await session.generateRequest(event.initDataType, event.initData);
        })
        .catch(fail);
    };

    scope.on(element, "encrypted", onEncrypted as EventListener);
  },
}));
