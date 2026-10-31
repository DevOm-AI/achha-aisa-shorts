import React from "react";
import { Img } from "remotion";

// Twemoji artwork (CC-BY 4.0) so emoji render identically everywhere.
export const twemojiUrl = (emoji: string) => {
  const code = Array.from(emoji)
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((cp) => cp !== "fe0f")
    .join("-");
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${code}.svg`;
};

export const Emoji: React.FC<{ emoji: string; size: number; style?: React.CSSProperties }> = ({
  emoji,
  size,
  style,
}) => <Img src={twemojiUrl(emoji)} style={{ width: size, height: size, ...style }} />;
