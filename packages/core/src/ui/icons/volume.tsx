import { AnimatePresence, motion } from "motion/react";

const Volume = ({ volume, isMuted }: { volume: number; isMuted: boolean }) => {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const mapRange = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
    if (inMax === inMin) return outMin;
    const t = clamp((v - inMin) / (inMax - inMin), 0, 1);
    return outMin + (outMax - outMin) * t;
  };
  const opacity_start = mapRange(volume, 0, 0.3, 0.4, 1);
  const opacity_center = mapRange(volume, 0.3, 0.6, 0.4, 1);
  const opacity_end = mapRange(volume, 0.6, 1, 0.4, 1);

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      className="rv-w-6 rv-h-6 rv-fill-white"
      viewBox="0 0 512 512"
      key={JSON.stringify(isMuted)}
      animate={{ opacity: isMuted ? 0.5 : 1, x: isMuted ? 5 : 0 }}
    >
      <motion.path d="M232,416a23.88,23.88,0,0,1-14.2-4.68,8.27,8.27,0,0,1-.66-.51L125.76,336H56a24,24,0,0,1-24-24V200a24,24,0,0,1,24-24h69.75l91.37-74.81a8.27,8.27,0,0,1,.66-.51A24,24,0,0,1,256,120V392a24,24,0,0,1-24,24ZM125.82,336Zm-.27-159.86Z" />
      <AnimatePresence mode="wait">
        {isMuted && (
          <motion.path
            key={JSON.stringify(isMuted)}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, x: -48, y: 48 }}
            exit={{ opacity: 0, x: 0, y: 0 }}
            transition={{
              duration: 0.3,
            }}
            xmlns="http://www.w3.org/2000/svg"
            d="M452.15,37.997c-9.868-9.658-25.698-9.482-35.353,0.386L76.371,386.316c-9.656,9.868-9.483,25.697,0.386,35.353     c4.863,4.76,11.175,7.131,17.481,7.131c6.49,0,12.975-2.511,17.871-7.517L452.535,73.349   C462.192,63.481,462.019,47.651,452.15,37.997z"
          />
        )}
        {!isMuted && (
          <motion.g
            key={JSON.stringify(isMuted)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.3,
            }}
          >
            <motion.path
              style={{ opacity: opacity_start }}
              d="M320,336a16,16,0,0,1-14.29-23.19c9.49-18.87,14.3-38,14.3-56.81,0-19.38-4.66-37.94-14.25-56.73a16,16,0,0,1,28.5-14.54C346.19,208.12,352,231.44,352,256c0,23.86-6,47.81-17.7,71.19A16,16,0,0,1,320,336Z"
            />
            <motion.path
              style={{ opacity: opacity_center }}
              d="M368,384a16,16,0,0,1-13.86-24C373.05,327.09,384,299.51,384,256c0-44.17-10.93-71.56-29.82-103.94a16,16,0,0,1,27.64-16.12C402.92,172.11,416,204.81,416,256c0,50.43-13.06,83.29-34.13,120A16,16,0,0,1,368,384Z"
            />
            <motion.path
              style={{ opacity: opacity_end }}
              d="M416,432a16,16,0,0,1-13.39-24.74C429.85,365.47,448,323.76,448,256c0-66.5-18.18-108.62-45.49-151.39a16,16,0,1,1,27-17.22C459.81,134.89,480,181.74,480,256c0,64.75-14.66,113.63-50.6,168.74A16,16,0,0,1,416,432Z"
            />
          </motion.g>
        )}
      </AnimatePresence>
    </motion.svg>
  );
};

export default Volume;
