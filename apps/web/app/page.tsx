'use client';
import { GithubIcon } from '@/components/icons';
import { subtitle, title } from '@/components/primitives';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import { Select, SelectItem } from '@nextui-org/select';
import { Snippet } from '@nextui-org/snippet';
import { Switch } from '@nextui-org/switch';
import { Video } from 'react-video-kit';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const packages = [
  { label: 'pnpm', value: 'pnpm add react-video-kit' },
  { label: 'npm', value: 'npm add react-video-kit' },
  { label: 'yarn', value: 'yarn add react-video-kit' },
  { label: 'bun', value: 'bun add react-video-kit' },
];

const schema = z.object({
  src: z.string().url(),
  multipleSources: z.boolean().optional(),
  title: z.string().optional(),
  autoPlay: z.boolean().optional(),
  loop: z.boolean().optional(),
  poster: z.string().url().optional(),
  subtitle: z.string().optional(),
  showControls: z.boolean().optional(),
  hideSliderThumb: z.boolean().optional(),
});

export default function Home() {
  const [value, setValue] = useState<Selection>(
    new Set(['pnpm add react-video-kit']) as unknown as Selection,
  );
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      autoPlay: true,
      loop: false,
      title: 'Example Video',
      subtitle: 'This is an example video',
      hideSliderThumb: true,
      multipleSources: false,
      src: 'https://vjs.zencdn.net/v/oceans.mp4',
      showControls: true,
    },
  });

  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="flex w-full justify-center items-center flex-col gap-4 px-4">
        <h3 className={title()}>react-video-kit</h3>
        <p className={subtitle({ class: 'text-center' })}>
          A highly customizable react video component for your app
        </p>
        <div className="flex justify-center items-center w-full gap-2">
          <Snippet className="w-2/3 md:w-auto overflow-scroll">
            {[...((value as unknown as Set<string>) ?? [])][0]}
          </Snippet>
          <Select
            radius="lg"
            size="sm"
            variant="faded"
            // @ts-ignore
            selectedKeys={value}
            className="w-24"
            // @ts-ignore
            onSelectionChange={setValue}
          >
            {packages.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="w-full py-16 flex flex-col gap-8 justify-center items-center">
          <div className="flex flex-col gap-4 justify-center items-center w-full px-4">
            <h3 className={title({ size: 'sm' })}>Try it for yourself</h3>
            <p className={subtitle({ class: 'text-center' })}>
              Try changing the values below to see the video component in action
            </p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={JSON.stringify({
                src: form.watch('src'),
                poster: form.watch('poster'),
                hideSliderThumb: form.watch('hideSliderThumb'),
                autoPlay: form.watch('autoPlay'),
                loop: form.watch('loop'),
                show: form.watch('showControls'),
              })}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex justify-center items-center"
            >
              <Video
                src={form.watch('src')}
                poster={form.watch('poster')}
                title={form.watch('title')}
                subtitle={form.watch('subtitle')}
                hideSliderThumb={form.watch('hideSliderThumb')}
                autoPlay={form.watch('autoPlay')}
                loop={form.watch('loop')}
                showControls={form.watch('showControls')}
                onLoad={() => {
                  setLoading(false);
                }}
              />
            </motion.div>
          </AnimatePresence>
          <div className="grid grid-cols-2 lg:grid-cols-4 w-full gap-6">
            <Input
              labelPlacement="outside"
              value={form.watch('src')}
              onChange={(e) => form.setValue('src', e.target.value)}
              label="Video Source"
              placeholder="https://example.com/video.mp4"
            />
            <Input
              labelPlacement="outside"
              value={form.watch('poster')}
              onChange={(e) => form.setValue('poster', e.target.value)}
              label="Poster"
              placeholder="https://example.com/poster.jpg"
            />
            <Input
              labelPlacement="outside"
              value={form.watch('title')}
              onChange={(e) => form.setValue('title', e.target.value)}
              label="Title"
              placeholder="Video Title"
            />
            <Input
              labelPlacement="outside"
              value={form.watch('subtitle')}
              onChange={(e) => form.setValue('subtitle', e.target.value)}
              label="Subtitle"
              placeholder="Video Subtitle"
            />
            <Switch
              classNames={{
                wrapper: 'group-data-[selected=true]:bg-default-900',
                thumb: 'group-data-[selected=true]:bg-default-100',
              }}
              isSelected={form.watch('hideSliderThumb') ?? false}
              onValueChange={(value) => form.setValue('hideSliderThumb', value)}
            >
              Hide Slider Thumb
            </Switch>
            <Switch
              classNames={{
                wrapper: 'group-data-[selected=true]:bg-default-900',
                thumb: 'group-data-[selected=true]:bg-default-100',
              }}
              isSelected={form.watch('autoPlay') ?? false}
              onValueChange={(value) => form.setValue('autoPlay', value)}
            >
              Auto Play
            </Switch>
            <Switch
              classNames={{
                wrapper: 'group-data-[selected=true]:bg-default-900',
                thumb: 'group-data-[selected=true]:bg-default-100',
              }}
              isSelected={form.watch('loop') ?? false}
              onValueChange={(value) => form.setValue('loop', value)}
            >
              Loop
            </Switch>
            <Switch
              classNames={{
                wrapper: 'group-data-[selected=true]:bg-default-900',
                thumb: 'group-data-[selected=true]:bg-default-100',
              }}
              isSelected={form.watch('showControls') ?? false}
              onValueChange={(value) => form.setValue('showControls', value)}
            >
              Show Controls
            </Switch>
          </div>
          <Button
            className="bg-default-900 text-default-100 mt-4"
            as={Link}
            size="lg"
            href="https://github.com/chaqchase/video-kit"
          >
            Read Docs <GithubIcon className="text-default-100" />
          </Button>
        </div>
      </div>
    </section>
  );
}
