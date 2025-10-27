import { cn } from "@/lib/utils";
import { ButtonProps } from "@/types/button.types";
import { motion } from "motion/react";

function Button({
  size = "md",
  radius = "md",
  className,
  children,
  onClick,
}: ButtonProps) {
  const buttonVariants = {
    hover: { scale: 1.1 },
    press: { scale: 0.9 },
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      className={cn(
        "rv-flex rv-justify-center rv-items-center",
        {
          "rv-w-8 rv-h-8": size === "sm",
          "rv-w-10 rv-h-10": size === "md",
          "rv-w-12 rv-h-12": size === "lg",
          "rv-rounded-none": radius === "none",
          "rv-rounded-sm": radius === "sm",
          "rv-rounded-md": radius === "md",
          "rv-rounded-lg": radius === "lg",
          "rv-rounded-full": radius === "full",
        },
        className
      )}
      variants={buttonVariants}
      whileHover="hover"
      whileTap="press"
      transition={{ type: "spring", stiffness: 700, damping: 30 }}
    >
      {children}
    </motion.button>
  );
}

export default Button;
