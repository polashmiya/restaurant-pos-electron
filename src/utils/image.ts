import { APP_CONFIG } from '@/config/app.config';
import { AppError } from './errors';

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be decoded'));
    image.src = source;
  });
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('File could not be read'));
    reader.readAsDataURL(file);
  });
}

/**
 * Turns a picked image file into a small local data URL (menu item photo).
 * Images never leave the computer and are resized so the menu stays fast.
 */
export async function imageFileToDataUrl(file: File, maxSize: number = APP_CONFIG.ui.menuImageMaxSize): Promise<string> {
  if (!file.type.startsWith('image/')) throw new AppError('validation', 'errors.imageFailed');
  if (file.size > MAX_SOURCE_BYTES) throw new AppError('validation', 'settings.menu.imageTooLarge');
  try {
    const image = await loadImage(await readFile(file));
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/webp', 0.85);
  } catch (error) {
    throw new AppError('validation', 'errors.imageFailed', { cause: error });
  }
}
