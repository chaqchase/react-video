import { cn } from "@/lib/utils";
import { ButtonProps } from "@/types/button.types";

function Button({
  size = "md",
  radius = "md",
  className,
  children,
  onClick,
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={cn(
        "rv-flex rv-justify-center rv-select-none rv-items-center",
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
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
