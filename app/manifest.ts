import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Medicine Tracker",
    short_name: "Medicine",
    description: "Track daily medicine for your pets.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F7FD",
    theme_color: "#4F7BF7",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
