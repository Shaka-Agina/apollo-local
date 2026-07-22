import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Apollo",
    short_name: "Apollo",
    description: "Soulseek client + music player",
    start_url: "/listen",
    display: "standalone",
    display_override: ["standalone", "browser"],
    categories: ["music", "entertainment"],

    orientation: "portrait",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
