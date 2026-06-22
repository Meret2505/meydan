import sharp from "sharp";
import { readFileSync } from "fs";

const any = readFileSync("public/icons/icon.svg");
const maskable = readFileSync("public/icons/maskable.svg");

const jobs = [
  { src: any, size: 192, out: "public/icons/icon-192.png" },
  { src: any, size: 512, out: "public/icons/icon-512.png" },
  { src: maskable, size: 192, out: "public/icons/maskable-192.png" },
  { src: maskable, size: 512, out: "public/icons/maskable-512.png" },
  { src: any, size: 512, out: "public/icons/play-store-512.png" },
];

for (const j of jobs) {
  await sharp(j.src, { density: 384 })
    .resize(j.size, j.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(j.out);
  console.log("ok", j.out);
}
