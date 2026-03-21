/**
 * PWA Icon Generator Script
 *
 * This script generates PNG icons from SVG sources for PWA.
 * Run with: node scripts/generate-icons.mjs
 *
 * Requires: sharp (npm install sharp)
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const iconsDir = join(publicDir, 'icons');

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// SVG template for the Beta cross icon
const createIconSvg = (size) => {
  const radius = Math.round(size * 0.167);
  const crossWidth = Math.round(size * 0.104);
  const crossHeight = Math.round(size * 0.5);
  const crossX = Math.round((size - crossWidth) / 2);
  const crossY = Math.round(size * 0.167);
  const hBarWidth = Math.round(size * 0.333);
  const hBarX = Math.round((size - hBarWidth) / 2);
  const hBarY = Math.round(size * 0.26);
  const fontSize = Math.round(size * 0.125);
  const textY = Math.round(size * 0.83);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#1B1B1B"/>
  <rect x="${crossX}" y="${crossY}" width="${crossWidth}" height="${crossHeight}" rx="4" fill="#BF531A"/>
  <rect x="${hBarX}" y="${hBarY}" width="${hBarWidth}" height="${crossWidth}" rx="4" fill="#BF531A"/>
  <text x="${size / 2}" y="${textY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#F5E7D7" text-anchor="middle">BETA</text>
</svg>`;
};

const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
];

const appleTouchIcon = { name: 'apple-touch-icon.png', size: 180 };

async function generateIcons() {
  console.log('Generating PWA icons...\n');

  // Generate regular icons
  for (const icon of sizes) {
    const svg = createIconSvg(icon.size);
    const outputPath = join(iconsDir, icon.name);

    try {
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);
      console.log(`Generated: ${icon.name}`);
    } catch (error) {
      console.error(`Failed to generate ${icon.name}:`, error.message);
    }
  }

  // Generate Apple Touch Icon
  const appleIconSvg = createIconSvg(appleTouchIcon.size);
  const appleIconPath = join(publicDir, appleTouchIcon.name);

  try {
    await sharp(Buffer.from(appleIconSvg))
      .png()
      .toFile(appleIconPath);
    console.log(`Generated: ${appleTouchIcon.name}`);
  } catch (error) {
    console.error(`Failed to generate ${appleTouchIcon.name}:`, error.message);
  }

  console.log('\nIcon generation complete!');
}

generateIcons().catch(console.error);
