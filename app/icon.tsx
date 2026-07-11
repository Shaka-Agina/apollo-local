import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          color: "#e8e8e8",
          fontSize: 296,
          fontWeight: 700,
          fontFamily: "monospace",
          letterSpacing: "0.1em",
          paddingLeft: "0.1em",
        }}
      >
        A
      </div>
    ),
    { ...size }
  );
}
