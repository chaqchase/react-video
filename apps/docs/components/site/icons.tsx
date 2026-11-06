import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import GithubIcon from "@hugeicons/core-free-icons/GithubIcon";
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon";
import Menu01Icon from "@hugeicons/core-free-icons/Menu01Icon";
import Moon02Icon from "@hugeicons/core-free-icons/Moon02Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Sun03Icon from "@hugeicons/core-free-icons/Sun03Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon, type HugeiconsIconProps, type IconSvgElement } from "@hugeicons/react";

type IconProps = Omit<HugeiconsIconProps, "icon">;

// Each icon is imported on its own, because the package's index holds all of them.
const icon = (svg: IconSvgElement, size = 16, strokeWidth = 1.75) =>
  function SiteIcon(props: IconProps) {
    return <HugeiconsIcon icon={svg} size={size} strokeWidth={strokeWidth} aria-hidden={true} {...props} />;
  };

export const ChevronIcon = icon(ArrowRight01Icon, 14, 2);
export const CopyIcon = icon(Copy01Icon, 15);
export const CheckIcon = icon(Tick02Icon, 16, 2);
export const SearchIcon = icon(Search01Icon);
export const SunIcon = icon(Sun03Icon);
export const MoonIcon = icon(Moon02Icon);
export const MenuIcon = icon(Menu01Icon);
export const CloseIcon = icon(Cancel01Icon);
export const InfoIcon = icon(InformationCircleIcon);
export const WarnIcon = icon(Alert02Icon);
export const GitHubIcon = icon(GithubIcon);
