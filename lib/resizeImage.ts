/**
 * Browser only. Shrinks a photo before upload: crops the centre to a square
 * (avatars are shown in a circle) and scales it to `size` px, as a JPEG.
 * A phone photo of several MB comes out at roughly 30–80 KB.
 */
export async function resizeImage(file: File, size = 400, quality = 0.85): Promise<Blob> {
  const source = await loadImage(file);
  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!w || !h) throw new Error("Could not read that image.");

  const side = Math.min(w, h);
  const out = Math.min(size, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image.");
  ctx.fillStyle = "#fff"; // transparent PNGs get a white background instead of black
  ctx.fillRect(0, 0, out, out);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out);
  if ("close" in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Could not process that image.");
  return blob;
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap applies the phone's rotation (EXIF) so photos aren't sideways.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall back below (e.g. older Safari)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("That file isn't a photo this phone can read. Try a JPG or PNG.");
  } finally {
    // The image is already decoded, so the URL can go.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
