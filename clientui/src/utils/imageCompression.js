const DEFAULT_OPTIONS = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
  targetBytes: 1.5 * 1024 * 1024,
  maxInputBytes: 25 * 1024 * 1024,
};

const compressibleTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const readImage = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image file"));
    };
    image.src = objectUrl;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Unable to compress image"));
      },
      type,
      quality
    );
  });

const getOutputName = (file, outputType) => {
  const extension = outputType === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return `${baseName}.${extension}`;
};

export const compressImageFile = async (file, options = {}) => {
  if (!file) return null;

  const settings = { ...DEFAULT_OPTIONS, ...options };
  if (file.size > settings.maxInputBytes) {
    throw new Error(`Image is too large. Please choose an image under ${Math.round(settings.maxInputBytes / 1024 / 1024)}MB.`);
  }

  if (!compressibleTypes.has(file.type)) {
    return file;
  }

  const image = await readImage(file);
  const scale = Math.min(1, settings.maxWidth / image.width, settings.maxHeight / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const outputType = file.type === "image/webp" ? "image/webp" : "image/jpeg";
  let quality = settings.quality;
  let blob = await canvasToBlob(canvas, outputType, quality);

  while (blob.size > settings.targetBytes && quality > 0.52) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  if (blob.size >= file.size) {
    return file;
  }

  return new File([blob], getOutputName(file, outputType), {
    type: outputType,
    lastModified: Date.now(),
  });
};

export const formatFileSize = (bytes = 0) => {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};
