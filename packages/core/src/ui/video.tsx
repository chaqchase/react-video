/**
 * `framer-motion` typescript definitions are not up to date.
 *  So, I have to use `@ts-ignore` to ignore the errors.
 * I will remove it once the definitions are up to date.
 */
import { cn } from '@/lib/utils';
import * as RadixSlider from '@radix-ui/react-slider';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { formatTime } from '../lib/format-time';
import useVideo from '../lib/hooks/use-video';
import { VideoProps } from '../types/video.types';
import Button from './button';
import { If, IfElse } from './helpers';
import {
  BackBy10,
  EnterPip,
  ExitFullScreen,
  ExitPip,
  ForwardBy10,
  FullScreen,
  Loading,
  Pause,
  Play,
  Volume,
} from './icons';

/**
 * This a react video component built on top of `HTMLVideoElement`. It's highly customizable using `tailwindcss` and easy to use.
 *
 * @example
 * ```tsx
 * import { Video } from "video-kit";
 *
 * export default function Page() {
 *  return (
 *   <div className="flex justify-center items-center w-full">
 *    <Video
 *      src="https://vjs.zencdn.net/v/oceans.mp4"
 *    />
 *  </div>
 * )}
 * ```
 */
function Video({
  src,
  title,
  subtitle,
  className,
  onDuration,
  onEnded,
  onPause,
  onPlay,
  onPlaybackRateChange,
  onProgress,
  onVolumeChange,
  onLoad,
  poster,
  classNames,
  hideSliderThumb = true,
  showControls = true,
  autoPlay = true,
  loop,
  icons,
}: VideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }
    if (Array.isArray(src)) {
      src.forEach((s) => {
        const source = document.createElement('source');
        source.src = s.src;
        source.type = s.type;
        videoRef.current?.appendChild(source);
      });
    } else if (typeof src === 'string') {
      videoRef.current.src = src;
    } else {
      return;
    }
  }, [videoRef.current, src]);

  const {
    isPlaying,
    isMuted,
    isFullscreen,
    isPip,
    duration,
    currentTime,
    volume,
    handlePlay,
    handlePause,
    handleMute,
    handleUnmute,
    handleVolumeChange,
    handleSeek,
    handleFullScreen,
    handleExitFullScreen,
    handlePip,
    handleExitPip,
    remainingTime,
    backBy,
    forwardBy,
    isLoading,
    showControls: show,
    buffered,
    isLoaded,
  } = useVideo({
    src,
    onDuration,
    onEnded,
    onPause,
    onPlay,
    onPlaybackRateChange,
    onProgress,
    onVolumeChange,
    showControls,
    onLoad,
    videoRef,
    wrapperRef,
  });

  const _icons = {
    play: Play,
    pause: Pause,
    forwardBy10: ForwardBy10,
    backBy10: BackBy10,
    enterPip: EnterPip,
    exitPip: ExitPip,
    volume: Volume,
    fullScreen: FullScreen,
    exitFullScreen: ExitFullScreen,
    loading: Loading,
    ...icons,
  };

  return (
    <div
      ref={wrapperRef}
      className={cn('rv-relative rv-aspect-video', className, classNames?.base)}
    >
      <video
        crossOrigin="anonymous"
        controls={false}
        playsInline
        ref={videoRef}
        loop={loop}
        className={cn(
          {
            'rv-rounded-xl': !isFullscreen,
          },
          {
            'rv-h-full rv-w-full': FullScreen,
          },
          classNames?.video,
        )}
        poster={poster}
        preload="metadata"
        autoPlay={autoPlay}
        style={{
          objectFit: 'cover',
          objectPosition: 'center',
          pointerEvents: 'none',
        }}
      ></video>
      {/* @ts-ignore */}
      <AnimatePresence>
        {/* @ts-ignore */}
        <motion.div
          key={JSON.stringify(show)}
          initial={{ opacity: 0 }}
          animate={{
            opacity: show && !isFullscreen ? 0.5 : 0,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
          className={cn(
            'rv-absolute rv-inset-0 rv-bg-gradient-to-t rv-from-black rv-via-transparent rv-to-black',
            { 'rv-rounded-xl': !isFullscreen },
            classNames?.backdrop,
          )}
        />
      </AnimatePresence>
      {/* @ts-ignore */}
      <AnimatePresence>
        {show && (
          // @ts-ignore
          <motion.div
            key={JSON.stringify(show)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.4,
              ease: 'easeInOut',
            }}
            className={cn(
              'rv-absolute rv-inset-0 rv-flex rv-justify-between rv-px-4 rv-h-fit xl:rv-px-8 rv-gap-2 xl:rv-gap-2 rv-py-3 rv-top-0',
              classNames?.topWrapper,
            )}
          >
            <div className="rv-w-full rv-flex">
              <If condition={!isPip}>
                <Button
                  size="lg"
                  radius="full"
                  className="rv-bg-transparent rv-z-50"
                  onClick={() => {
                    if (isFullscreen) {
                      handleExitFullScreen();
                    } else {
                      handleFullScreen();
                    }
                  }}
                >
                  <IfElse
                    fallback={<_icons.fullScreen />}
                    condition={isFullscreen}
                  >
                    <_icons.exitFullScreen />
                  </IfElse>
                </Button>
              </If>
              <If condition={!isFullscreen}>
                <Button
                  size="lg"
                  radius="full"
                  className="rv-bg-transparent rv-z-50"
                  onClick={() => {
                    if (isPip) {
                      handleExitPip();
                    } else {
                      handlePip();
                    }
                  }}
                >
                  <IfElse fallback={<_icons.enterPip />} condition={isPip}>
                    <_icons.exitPip />
                  </IfElse>
                </Button>
              </If>
            </div>
            <div className="rv-w-full rv-flex rv-justify-end rv-items-center rv-h-fit">
              <Button
                size="lg"
                radius="full"
                className="rv-bg-transparent rv-z-50"
                onClick={() => {
                  if (isMuted) {
                    handleUnmute();
                  } else {
                    handleMute();
                  }
                }}
              >
                <_icons.volume isMuted={isMuted} volume={volume} />
              </Button>
              <RadixSlider.Root
                className={cn(
                  'rv-relative rv-z-50 rv-items-center rv-select-none rv-touch-none rv-w-full rv-h-5 rv-hidden lg:rv-flex lg:rv-w-1/4',
                  classNames?.volumeSlider?.root,
                )}
                onValueChange={(value) => {
                  handleVolumeChange(Number(value));
                }}
                value={[volume]}
                min={0}
                max={1}
                step={0.01}
              >
                <RadixSlider.Track
                  className={cn(
                    'rv-bg-white rv-backdrop-filter rv-overflow-hidden rv-backdrop-blur-sm rv-h-3 rv-bg-opacity-20 rv-relative rv-grow rv-rounded-full',
                    classNames?.volumeSlider?.track,
                  )}
                >
                  <RadixSlider.Range
                    className={cn(
                      'rv-absolute rv-bg-white rv-rounded-full rv-h-full',
                      classNames?.volumeSlider?.range,
                    )}
                  />
                </RadixSlider.Track>
                <If condition={!hideSliderThumb}>
                  <RadixSlider.Thumb
                    className={cn(
                      'rv-block rv-w-5 rv-h-5 rv-bg-white rv-shadow-[0_2px_2px] rv-shadow-black rv-rounded-[10px] hover:rv-bg-white focus:rv-outline-none focus:rv-shadow-[0_0_0_2px] focus:rv-shadow-white/10',
                      classNames?.volumeSlider?.thumb,
                    )}
                    aria-label="Volume"
                  />
                </If>
              </RadixSlider.Root>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* @ts-ignore */}
      <AnimatePresence>
        {show && (
          //@ts-ignore
          <motion.div
            key={JSON.stringify(show)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.4,
              ease: 'easeInOut',
            }}
            className={cn(
              'rv-absolute rv-inset-0 xl:rv-mb-0 rv-px-8 rv-gap-8 rv-flex rv-justify-center rv-w-full rv-items-center',
              classNames?.centerWrapper,
              {
                'rv-mb-8': Boolean(title || subtitle),
              },
            )}
          >
            <IfElse
              className="rv-flex rv-justify-center rv-z-50"
              fallbackClassName="rv-flex rv-justify-center rv-z-50"
              fallback={
                <div className="">
                  <_icons.loading />
                </div>
              }
              condition={!isLoading}
            >
              <Button size="lg" radius="full" onClick={(e) => backBy(10)}>
                <_icons.backBy10 />
              </Button>
              <Button
                onClick={() => {
                  if (isPlaying) {
                    handlePause();
                  } else {
                    handlePlay();
                  }
                }}
                size="lg"
                radius="full"
              >
                <If condition={isPlaying}>
                  <_icons.pause />
                </If>
                <If condition={!isPlaying}>
                  <_icons.play />
                </If>
              </Button>
              <Button onClick={() => forwardBy(10)} size="lg" radius="full">
                <_icons.forwardBy10 />
              </Button>
            </IfElse>
          </motion.div>
        )}
      </AnimatePresence>
      {/* @ts-ignore */}
      <AnimatePresence>
        {show && (
          // @ts-ignore
          <motion.div
            key={JSON.stringify(show)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.4,
              ease: 'easeInOut',
            }}
            className={cn(
              'rv-absolute rv-inset-0 rv-flex rv-flex-col rv-justify-end rv-px-6 xl:rv-px-8 rv-gap-2 lg:rv-gap-3 rv-py-4 xl:rv-py-6 rv-bottom-0',
              classNames?.bottomWrapper,
            )}
          >
            <div className="rv-w-full rv-flex rv-justify-between rv-items-center rv-gap-21">
              <If condition={Boolean(title || subtitle)}>
                <div className="rv-flex rv-flex-col">
                  <If condition={Boolean(subtitle)}>
                    <p
                      className={cn(
                        'rv-text-[0.5rem] xl:rv-text-base rv-my-0 rv-text-white/80',
                        classNames?.subtitle,
                      )}
                    >
                      {subtitle ?? ''}
                    </p>
                  </If>
                  <If condition={Boolean(title)}>
                    <h2
                      className={cn(
                        'rv-text-[1rem] xl:rv-text-2xl rv-my-0 rv-font-semibold rv-text-white',
                        classNames?.title,
                      )}
                    >
                      {title ?? ''}
                    </h2>
                  </If>
                </div>
              </If>
            </div>
            <RadixSlider.Root
              className={cn(
                'rv-relative rv-flex rv-items-center rv-select-nones rv-touch-none rv-w-full',
                classNames?.playbackRateSlider?.root,
              )}
              onValueChange={(value) => {
                handleSeek(Number(value));
              }}
              value={[currentTime <= duration ? currentTime : 0]}
              min={0}
              max={duration}
              step={0.01}
            >
              <RadixSlider.Track
                className={cn(
                  'rv-bg-white rv-backdrop-filter rv-overflow-hidden backdrop-blur-sm rv-h-2 lg:rv-h-3 rv-bg-opacity-20 rv-relative rv-grow rv-rounded-full',
                  classNames?.playbackRateSlider?.track,
                )}
              >
                <RadixSlider.Range
                  className={cn(
                    'rv-absolute rv-bg-white rv-h-full',
                    hideSliderThumb ? 'rv-rounded-full' : 'rv-rounded-none',
                    classNames?.playbackRateSlider?.range,
                  )}
                />
              </RadixSlider.Track>
              <If condition={!hideSliderThumb}>
                <RadixSlider.Thumb
                  className={cn(
                    'rv-block rv-w-3 rv-h-3 lg:rv-w-6 lg:rv-h-6 rv-bg-white rv-rounded-full hover:rv-bg-white focus:rv-outline-none focus:rv-shadow-[0_0_0_2px] focus:rv-shadow-white',
                    classNames?.playbackRateSlider?.thumb,
                  )}
                  aria-label="Volume"
                />
              </If>
            </RadixSlider.Root>
            <div className="rv-flex rv-justify-between rv-items-center rv-w-full rv-h-2 xl:rv-h-4">
              <p className="rv-text-xs rv-text-white">
                {formatTime(currentTime)}
              </p>
              <p className="rv-text-xs rv-text-white">
                {formatTime(remainingTime, true)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Video;
