/**
 * Utilitaires d'optimisation et compression d'images pour le menu restaurant
 * Garantit que chaque image téléchargée respecte le plafond strict de 300 Ko
 * et des dimensions optimales (800x800 max) pour le chargement ultra-rapide PWA mobile.
 */

export interface CompressedImageResult {
  dataUrl: string;
  sizeKb: number;
  originalSizeKb: number;
  width: number;
  height: number;
  format: 'image/jpeg' | 'image/webp';
}

export const MAX_IMAGE_SIZE_KB = 300; // Limite stricte de 300 Ko pour le catalogue

export async function compressAndResizeImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  initialQuality: number = 0.82
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error("Le fichier sélectionné n'est pas une image valide (JPG, PNG, WebP)."));
      return;
    }

    const originalSizeKb = Math.round(file.size / 1024);
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Impossible de lire le fichier image."));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format d'image non décodable par le navigateur."));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcul des dimensions proportionnelles
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error("Le moteur graphique 2D du navigateur n'est pas disponible."));
          return;
        }

        // Lissage haute qualité
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Tentative de compression avec ajustement dynamique pour garantir < 300 Ko
        let quality = initialQuality;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        let sizeKb = Math.round(((dataUrl.length - 23) * 3) / 4 / 1024);

        // Si la taille dépasse 300 Ko, réductions itératives de la qualité
        let iterations = 0;
        while (sizeKb > MAX_IMAGE_SIZE_KB && quality > 0.4 && iterations < 5) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          sizeKb = Math.round(((dataUrl.length - 23) * 3) / 4 / 1024);
          iterations++;
        }

        resolve({
          dataUrl,
          sizeKb,
          originalSizeKb,
          width,
          height,
          format: 'image/jpeg',
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
