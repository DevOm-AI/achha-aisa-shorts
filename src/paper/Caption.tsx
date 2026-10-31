import React from "react";
import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";

type CaptionProps = {
  readonly children: string;
  readonly highlight: string;
  readonly style?: React.CSSProperties;
};

const clean = (w: string) => w.replace(/[^A-Z0-9']/gi, "").toUpperCase();

// Shorts-style caption: words pop in one after another, key words in yellow.
const CaptionInner: React.FC<CaptionProps> = ({ children, highlight, style }) => {
  const frame = useCurrentFrame();
  const hl = new Set(highlight.split(" ").map(clean).filter(Boolean));
  const words = children.split(" ");

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 340,
        padding: "0 70px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: "0.28em",
        fontFamily: "Montserrat",
        fontWeight: 900,
        fontSize: 104,
        lineHeight: 1.1,
        textAlign: "center",
        ...style,
      }}
    >
      {words.map((w, i) => {
        const start = i * 2;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: hl.has(clean(w)) ? "#FFD60A" : "#FFFFFF",
              WebkitTextStroke: "0.14em #000",
              paintOrder: "stroke fill",
              textShadow: "0 0.08em 0 rgba(0,0,0,0.45)",
              opacity: interpolate(frame, [start, start + 2], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: String(
                interpolate(frame, [start, start + 7], [0.45, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.34, 1.45, 0.64, 1),
                }),
              ),
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Caption = Interactive.create({
  Component: CaptionInner,
  layout: "none",
  schema: {
    children: { type: "string", default: "", description: "Text" },
    highlight: { type: "string", default: "", description: "Highlighted words" },
  },
});
