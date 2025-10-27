/**
 * Video source configuration. Can be a single URL string or an array of source objects
 * with different quality levels.
 */
export type VideoSource =
  | string
  | Array<{ src: string; type: string; label: string }>;

/**
 * Text track configuration for captions, subtitles, or other text tracks.
 */
export type VideoTrack = {
  /** URL of the track file (e.g., WebVTT) */
  src: string;
  /** Type of text track */
  kind: TextTrackKind;
  /** Language code (e.g., 'en', 'es') */
  srclang?: string;
  /** Human-readable label */
  label?: string;
  /** Whether this track should be enabled by default */
  default?: boolean;
};

/**
 * Imperative handle for controlling video playback programmatically.
 * Access via ref on Video.Root component.
 */
export type VideoHandle = {
  /** Start or resume video playback */
  play: () => void;
  /** Pause video playback */
  pause: () => void;
  /** Seek to a specific time in seconds */
  seek: (seconds: number) => void;
  /** Set volume level (0-1) */
  setVolume: (value: number) => void;
  /** Mute audio */
  mute: () => void;
  /** Unmute audio */
  unmute: () => void;
  /** Enter fullscreen mode */
  enterFullscreen: () => void;
  /** Exit fullscreen mode */
  exitFullscreen: () => void;
  /** Enter picture-in-picture mode */
  enterPip: () => void;
  /** Exit picture-in-picture mode */
  exitPip: () => void;
};

type VideoProps = {
  /**
   * The source of the video.
   * Can be a string or an array of objects with src, type and label.
   * Example:
   * ```js
   * [
   *  {
   *    src: 'https://example.com/video.mp4',
   *    type: 'video/mp4',
   *    label: 'SD',
   *  },
   *  {
   *    src: 'https://example.com/video.mp4',
   *    type: 'video/mp4',
   *    label: 'HD',
   *  },
   * ]
   *
   * // or
   *
   * 'https://example.com/video.mp4'
   * ```
   */
  src: VideoSource;
  /**
   * The poster of the video.
   * Example:
   * ```js
   * 'https://example.com/poster.jpg'
   * ```
   */
  poster?: string;
  /**
   * Tracks for captions/subtitles.
   * Example:
   * ```js
   * [
   *  {
   *    src: 'https://example.com/captions-en.vtt',
   *    kind: 'captions',
   *    srclang: 'en',
   *    label: 'English',
   *    default: true,
   *  },
   * ]
   * ```
   */
  tracks?: VideoTrack[];
  /**
   * The title of the video.
   * Example:
   * ```js
   * 'Video title'
   * ```
   */
  title?: string;
  /**
   * The subtitle of the video.
   * Example:
   * ```js
   * 'Video subtitle'
   * ```
   */
  subtitle?: string;
  /**
   * `onProgress` is called every time the video progress changes.
   */
  onProgress?: (currentTime: number) => void;
  /**
   * `onDuration` is called when the video duration is available.
   */
  onDuration?: (duration: number) => void;
  /**
   * `onEnded` is called when the video ends.
   */
  onEnded?: () => void;
  /**
   * `onPlay` is called when the video is played.
   */
  onPlay?: () => void;
  /**
   * `onPause` is called when the video is paused.
   */
  onPause?: () => void;
  /**
   * `onLoad` is called when the video is loaded.
   */
  onLoad?: () => void;
  /**
   * `onVolumeChange` is called when the volume is changed.
   */
  onVolumeChange?: (volume: number) => void;
  /**
   * `onPlaybackRateChange` is called when the playback rate is changed.
   */
  onPlaybackRateChange?: (playbackRate: number) => void;
  /**
   * `onTrackChange` is called when the active text track is changed.
   * Receives the track index (null for Off) and the track object.
   */
  onTrackChange?: (index: number | null, track?: VideoTrack | null) => void;
  /**
   * `onQualityChange` is called when the video quality/source is changed.
   * Only relevant when src is an array of sources.
   */
  onQualityChange?: (
    index: number,
    source: { src: string; type: string; label?: string }
  ) => void;
  /**
   * Default track index to enable on mount. null means no track (Off).
   */
  defaultTrackIndex?: number | null;
  /**
   * Default quality index to start with when src is an array.
   */
  defaultQualityIndex?: number;
  /**
   * The root CSS class.
   */
  className?: string;
  /**
   * `autoPlay` indicates whether the video should start playing as soon as it is ready.
   */
  autoPlay?: boolean;
  /**
   * `loop` indicates whether the video should start over again, every time it is finished.
   */
  loop?: boolean;
  /**
   * `showControls` indicates whether the video controls should be visible.
   */
  showControls?: boolean;
  icons?: Partial<{
    play: () => JSX.Element;
    pause: () => JSX.Element;
    forwardBy10: () => JSX.Element;
    backBy10: () => JSX.Element;
    enterPip: () => JSX.Element;
    exitPip: () => JSX.Element;
    volume: ({
      volume,
      isMuted,
    }: {
      volume: number;
      isMuted: boolean;
    }) => JSX.Element;
    fullScreen: () => JSX.Element;
    exitFullScreen: () => JSX.Element;
    loading: () => JSX.Element;
  }>;
  /**
   * `classNames` is an object containing the CSS classes of the different elements.
   */
  classNames?: {
    /**
     * `base` is the root CSS class.
     */
    base?: string;
    /**
     * `title` is the CSS class of the title.
     */
    title?: string;
    /**
     * `subtitle` is the CSS class of the subtitle.
     */
    subtitle?: string;
    /**
     * `topWrapper` is the CSS class of the top wrapper.
     */
    topWrapper?: string;
    /**
     * `centerWrapper` is the CSS class of the center wrapper.
     */
    centerWrapper?: string;
    /**
     * `bottomWrapper` is the CSS class of the bottom wrapper.
     */
    bottomWrapper?: string;
    /**
     * `video` is the CSS class of the video.
     */
    video?: string;
    /**
     * `backdrop` is the CSS class of the backdrop.
     */
    backdrop?: string;
    /**
     * `volumeSlider` is the CSS classes of the volume slider.
     */
    volumeSlider?: {
      /**
       * `root` is the CSS class of the volume slider root.
       */
      root?: string;
      /**
       * `track` is the CSS class of the volume slider track.
       */
      track?: string;
      /**
       * `thumb` is the CSS class of the volume slider thumb.
       */
      thumb?: string;
      /**
       * `range` is the CSS class of the volume slider range.
       */
      range?: string;
    };
    /**
     * `playbackRateSlider` is the CSS classes of the playback rate slider.
     */
    playbackRateSlider?: {
      /**
       * `root` is the CSS class of the playback rate slider root.
       */
      root?: string;
      /**
       * `track` is the CSS class of the playback rate slider track.
       */
      track?: string;
      /**
       * `thumb` is the CSS class of the playback rate slider thumb.
       */
      thumb?: string;
      /**
       * `range` is the CSS class of the playback rat slider range.
       */
      range?: string;
    };
  };
  /**
   * `hideSliderThumb` indicates whether the slider thumb should be hidden.
   */
  hideSliderThumb?: boolean;
};

export type { VideoProps };
