import { cn } from "@/lib/utils";
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

type DropdownContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be used within Dropdown.Root");
  }
  return context;
}

type DropdownRootProps = {
  children: React.ReactNode;
  modal?: boolean;
};

function DropdownRoot({ children }: DropdownRootProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      {children}
    </DropdownContext.Provider>
  );
}

type DropdownTriggerProps = {
  children: React.ReactElement;
  asChild?: boolean;
};

function DropdownTrigger({ children, asChild }: DropdownTriggerProps) {
  const { isOpen, setIsOpen, triggerRef } = useDropdownContext();

  const handleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      onClick: (e: React.MouseEvent) => {
        handleClick();
        children.props.onClick?.(e);
      },
      "aria-expanded": isOpen,
      "aria-haspopup": "true",
    } as any);
  }

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      onClick={handleClick}
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      {children}
    </button>
  );
}

type DropdownPortalProps = {
  children: React.ReactNode;
  container?: HTMLElement | null;
};

function DropdownPortal({ children, container }: DropdownPortalProps) {
  const { isOpen } = useDropdownContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>{isOpen && children}</AnimatePresence>,
    container || document.body
  );
}

type DropdownContentProps = {
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
  align?: "start" | "center" | "end";
};

function DropdownContent({
  children,
  className,
  sideOffset = 5,
  align = "start",
}: DropdownContentProps) {
  const { isOpen, setIsOpen, triggerRef } = useDropdownContext();
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const prefersReducedMotion = usePrefersReducedMotion();

  // Calculate position - open to top
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const update = () => {
      if (!triggerRef.current || !contentRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();

      let left = triggerRect.left;
      if (align === "end") {
        left = triggerRect.right - contentRect.width;
      } else if (align === "center") {
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
      }

      setPosition({
        top: triggerRect.top - contentRect.height - sideOffset,
        left,
      });
    };

    // Initial update
    const timer = setTimeout(update, 0);

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, sideOffset, align, triggerRef]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setIsOpen, contentRef, triggerRef]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, setIsOpen]);

  return (
    <motion.div
      ref={contentRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.2,
        ease: "easeOut",
      }}
      className={className}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 100,
      }}
      role="menu"
    >
      {children}
    </motion.div>
  );
}

type DropdownItemProps = {
  children: React.ReactNode;
  className?: string;
  onSelect?: () => void;
  role?: string;
  "aria-checked"?: boolean;
};

function DropdownItem({
  children,
  className,
  onSelect,
  role,
  ...props
}: DropdownItemProps) {
  const { setIsOpen } = useDropdownContext();

  const handleClick = () => {
    onSelect?.();
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={role || "menuitem"}
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
}

type DropdownSeparatorProps = {
  className?: string;
};

function DropdownSeparator({ className }: DropdownSeparatorProps) {
  return <div className={className} role="separator" />;
}

// Shared menu styles
export const menuStyles = {
  container: "rv-bg-black/20 rv-backdrop-blur-2xl rv-rounded-2xl rv-p-1 rv-shadow-2xl rv-border rv-border-white/5",
  separator: "rv-h-[1px] rv-bg-white/10 rv-my-1",
  item: {
    base: "rv-text-xs rv-text-white/80 rv-px-2.5 rv-py-1.5 rv-rounded-xl rv-cursor-pointer rv-outline-none rv-transition-colors",
    hover: "hover:rv-bg-white/10 hover:rv-text-white focus:rv-bg-white/10",
    active: "rv-bg-white/10 rv-text-white rv-font-medium",
  },
} as const;

// Backward compatibility
export const menuItemStyles = menuStyles.item;

export const Dropdown = {
  Root: DropdownRoot,
  Trigger: DropdownTrigger,
  Portal: DropdownPortal,
  Content: DropdownContent,
  Item: DropdownItem,
  Separator: DropdownSeparator,
};
