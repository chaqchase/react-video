import { toErrorInfo, VideoKitError } from "../../core/kit-error";
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
  if (!response.ok) {
    const { status } = response;
    throw new VideoKitError(
      status === 401 || status === 403 ? "drm-denied" : "drm-license",
      `The licence server returned ${status}.`,
      { retryable: status !== 401 && status !== 403, nativeCode: status }
    );
  }
  return response.arrayBuffer();
}

async function setCertificate(keys: MediaKeys, url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`The certificate server returned ${response.status}.`);
    await keys.setServerCertificate(await response.arrayBuffer());
  } catch (cause) {
    throw new VideoKitError("drm-certificate", cause instanceof Error ? cause.message : String(cause), {
      retryable: true,
      cause,
    });
  }
}

const usable = new Set<MediaKeyStatus>(["usable", "output-downscaled", "status-pending"]);

/** Says why none of a session's keys can play anything, or returns null if some can. */
function keyFailure(session: MediaKeySession) {
  const statuses: MediaKeyStatus[] = [];
  session.keyStatuses.forEach((status) => statuses.push(status));
  const [status] = statuses;
  if (!status || statuses.some((each) => usable.has(each))) return null;
  return new VideoKitError(
    status === "expired" ? "drm-expired" : status === "output-restricted" ? "drm-output-restricted" : "drm-session",
    `The key's status is ${status}.`,
    { retryable: false, nativeCode: status }
  );
}

/**
 * Protected playback from one description. Engines handle their own key systems, and
 * this runs the same exchange for streams the browser plays directly, as FairPlay
 * does in Safari. Systems are tried in a fixed order, Widevine, PlayReady, FairPlay,
 * then Clear Key, whatever order the config lists them in.
 */
export const drm = definePlugin("drm", (options: DrmOptions) => ({
  state: () => ({
    /** The key system the current source plays through natively, or null until it needs one. */
    system: null as string | null,
  }),
  source(context) {
    context.set({ system: null });
  },
  gates: {
    load(request, next) {
      const config = typeof options === "function" ? options(request.source) : options;
      return next(config ? { ...request, drm: config } : request);
    },
  },
  attach(context, element, scope) {
    let config: DrmConfig | null = null;
    let ready: Promise<SystemName> | null = null;
    let chosen: SystemName | null = null;
    let currentSrc: string | null = null;
    const seen = new Set<string>();

    const prepare = async (): Promise<SystemName> => {
      const available = (Object.keys(KEY_SYSTEMS) as SystemName[]).filter((name) => config?.[name]);
      let failure: unknown;
      for (const name of available) {
        try {
          const access = await navigator.requestMediaKeySystemAccess(
            KEY_SYSTEMS[name],
            CAPABILITIES
          );
          const keys = await access.createMediaKeys();
          if (name === "fairplay" && config?.fairplay) {
            await setCertificate(keys, config.fairplay.certificateUrl);
          }
          await element.setMediaKeys(keys);
          chosen = name;
          return name;
        } catch (error) {
          // On to the next system.
          failure = error;
        }
      }
      throw failure instanceof VideoKitError
        ? failure
        : new VideoKitError("drm-unsupported", "This browser supports none of the configured key systems.", {
            retryable: false,
            cause: failure,
          });
    };

    const fail = (error: unknown) => {
      if (scope.signal.aborted) return;
      context.error(toErrorInfo(error, { code: "drm-session", fatal: true, retryable: false }));
    };

    const onEncrypted = (event: MediaEncryptedEvent) => {
      // Engines read the same event and run their own sessions.
      const { provider, source } = context.media();
      if (provider !== "native" || !source || !event.initData) return;
      const resolved = typeof options === "function" ? options(source) : options;
      if (!resolved) return;
      config = resolved;

      if (source.src !== currentSrc) {
        currentSrc = source.src;
        seen.clear();
        // Keys stay while the new source can use them, since replacing them can fail in some browsers.
        if (chosen && !resolved[chosen]) ready = null;
      }

      const id = decoder.decode(event.initData);
      if (seen.has(id)) return;
      seen.add(id);

      ready ??= prepare();
      ready
        .then(async (name) => {
          const keys = element.mediaKeys;
          if (!keys || !event.initData) return;
          context.set({ system: KEY_SYSTEMS[name] });
          const session = keys.createSession();
          scope.add(() => void session.close().catch(() => {}));
          session.addEventListener("keystatuseschange", () => {
            const failure = keyFailure(session);
            if (failure) fail(failure);
          });
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
        .catch((error: unknown) => {
          // Reloading goes through all this again, rather than staying stuck on this failure.
          ready = null;
          chosen = null;
          seen.clear();
          fail(error);
        });
    };

    scope.on(element, "encrypted", onEncrypted as EventListener);
  },
}));
