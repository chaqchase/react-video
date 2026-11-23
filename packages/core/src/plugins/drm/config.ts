import type { HlsConfig } from "hls.js";

export interface KeySystemConfig {
  /** Where licence requests are sent. */
  licenseUrl: string;
  /** Sent with each licence request. */
  headers?: Record<string, string>;
  /** Send cookies with licence requests. */
  withCredentials?: boolean;
}

export interface FairPlayConfig extends KeySystemConfig {
  /** Where to fetch the FairPlay server certificate. */
  certificateUrl: string;
}

export interface ClearKeyConfig {
  /** Key IDs mapped to keys, both in hex. */
  keys: Record<string, string>;
}

/** One description of protected playback, translated for whichever engine plays. */
export interface DrmConfig {
  /** Licence settings for Widevine. */
  widevine?: KeySystemConfig;
  /** Licence settings for PlayReady. */
  playready?: KeySystemConfig;
  /** Licence and certificate settings for FairPlay. */
  fairplay?: FairPlayConfig;
  /** The keys for Clear Key, which needs no licence server. */
  clearkey?: ClearKeyConfig;
}

export const KEY_SYSTEMS = {
  widevine: "com.widevine.alpha",
  playready: "com.microsoft.playready",
  fairplay: "com.apple.fps",
  clearkey: "org.w3.clearkey",
} as const;

const toBase64Url = (hex: string) =>
  btoa(String.fromCharCode(...(hex.match(/../g) ?? []).map((byte) => parseInt(byte, 16))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** The JSON Web Key Set a Clear Key session wants as its licence. */
export function clearKeyLicense(keys: Record<string, string>, requested?: string[]) {
  const all = Object.entries(keys).map(([kid, key]) => ({
    kty: "oct",
    kid: toBase64Url(kid),
    k: toBase64Url(key),
  }));
  return {
    keys: requested ? all.filter(({ kid }) => requested.includes(kid)) : all,
    type: "temporary",
  };
}

export function toHlsDrm({ widevine, playready, fairplay }: DrmConfig): Partial<HlsConfig> {
  const headers = { ...widevine?.headers, ...playready?.headers, ...fairplay?.headers };
  const credentials = Boolean(
    widevine?.withCredentials || playready?.withCredentials || fairplay?.withCredentials
  );
  return {
    emeEnabled: true,
    drmSystems: {
      ...(widevine && { [KEY_SYSTEMS.widevine]: { licenseUrl: widevine.licenseUrl } }),
      ...(playready && { [KEY_SYSTEMS.playready]: { licenseUrl: playready.licenseUrl } }),
      ...(fairplay && {
        [KEY_SYSTEMS.fairplay]: {
          licenseUrl: fairplay.licenseUrl,
          serverCertificateUrl: fairplay.certificateUrl,
        },
      }),
    },
    licenseXhrSetup(xhr) {
      xhr.withCredentials = credentials;
      for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    },
  };
}

export function toDashDrm({ widevine, playready, clearkey }: DrmConfig) {
  const system = ({ licenseUrl, headers, withCredentials }: KeySystemConfig) => ({
    serverURL: licenseUrl,
    ...(headers && { httpRequestHeaders: headers }),
    ...(withCredentials && { withCredentials }),
  });
  return {
    ...(widevine && { [KEY_SYSTEMS.widevine]: system(widevine) }),
    ...(playready && { [KEY_SYSTEMS.playready]: system(playready) }),
    ...(clearkey && {
      [KEY_SYSTEMS.clearkey]: {
        clearkeys: Object.fromEntries(
          clearKeyLicense(clearkey.keys).keys.map(({ kid, k }) => [kid, k])
        ),
      },
    }),
  };
}
