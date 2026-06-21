"use client";

import Image from "next/image";
import clsx from "clsx";
import { useTheme } from "@/context/ThemeContext";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ className, priority }: BrandLogoProps) {
  const { theme } = useTheme();
  const src =
    theme === "dark" ? "/brand/biognition-dark.png?v=2" : "/brand/biognition-light.png?v=2";

  return (
    <Image
      src={src}
      alt="Biognition"
      width={320}
      height={120}
      priority={priority}
      unoptimized
      className={clsx("h-auto w-auto max-w-full object-contain object-left", className)}
    />
  );
}
