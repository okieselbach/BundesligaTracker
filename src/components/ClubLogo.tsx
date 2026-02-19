"use client";

import { useState } from "react";

interface ClubLogoProps {
  logoUrl?: string;
  name: string;
  shortName: string;
  primaryColor: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizePx = { sm: 20, md: 28, lg: 48, xl: 64 };
const fontSize = { sm: "text-[8px]", md: "text-[10px]", lg: "text-sm", xl: "text-lg" };

export function ClubLogo({ logoUrl, name, shortName, primaryColor, size = "md" }: ClubLogoProps) {
  const [imgError, setImgError] = useState(false);
  const px = sizePx[size];

  if (!logoUrl || imgError) {
    return (
      <div
        className={`${fontSize[size]} flex items-center justify-center rounded-full font-bold text-white shrink-0`}
        style={{
          width: px,
          height: px,
          backgroundColor: primaryColor,
          minWidth: px,
        }}
        title={name}
      >
        {shortName.slice(0, 3)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={name}
      title={name}
      className="shrink-0"
      style={{ width: px, height: px, objectFit: "contain" }}
      onError={() => setImgError(true)}
    />
  );
}
