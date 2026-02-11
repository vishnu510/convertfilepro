import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Convert images to a single PDF
 * @param {FileList|Array} files 
 * @returns {Promise<Blob>}
 */
export async function imagesToPdf(files) {
    const doc = new jsPDF();

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageData = await fileToDataURL(file);

        const img = new Image();
        img.src = imageData;
        await new Promise(resolve => img.onload = resolve);

        const imgWidth = img.width;
        const imgHeight = img.height;

        // Calculate dimensions to fit in A4
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
        const newWidth = imgWidth * ratio;
        const newHeight = imgHeight * ratio;

        const x = (pageWidth - newWidth) / 2;
        const y = (pageHeight - newHeight) / 2;

        if (i > 0) doc.addPage();
        doc.addImage(imageData, 'JPEG', x, y, newWidth, newHeight);
    }

    return doc.output('blob');
}

/**
 * Convert PDF pages to JPG images
 * @param {File} file 
 * @returns {Promise<Blob>} Returns a ZIP blob if multiple pages, else a JPG blob
 */
export async function pdfToImages(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const images = [];

    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        images.push({ name: `page-${i}.jpg`, dataUrl });
    }

    if (images.length === 1) {
        return dataURLtoBlob(images[0].dataUrl);
    } else {
        const zip = new JSZip();
        images.forEach(img => {
            const base64Data = img.dataUrl.split(',')[1];
            zip.file(img.name, base64Data, { base64: true });
        });
        return await zip.generateAsync({ type: 'blob' });
    }
}

/**
 * Convert between image formats (PNG <-> JPG)
 * @param {File} file 
 * @param {string} targetFormat 'image/jpeg' or 'image/png'
 * @returns {Promise<Blob>}
 */
export async function convertImageFormat(file, targetFormat) {
    const dataUrl = await fileToDataURL(file);
    const img = new Image();
    img.src = dataUrl;
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const resultDataUrl = canvas.toDataURL(targetFormat, 0.9);
    return dataURLtoBlob(resultDataUrl);
}

/**
 * Compress a PDF by re-rendering pages at lower quality
 * @param {File} file 
 * @param {number} quality Compression quality (0.1 to 1.0)
 * @returns {Promise<Blob>}
 */
export async function compressPdf(file, quality = 0.4) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Create new PDF with no default size (will be set per page)
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4'
    });

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // Use scale index to control quality/file size trade-off
        const viewport = page.getViewport({ scale: 1.0 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        // Use user-provided quality for compression
        const imageData = canvas.toDataURL('image/jpeg', quality);

        if (i > 1) {
            doc.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'l' : 'p');
        } else {
            // Re-initialize first page size
            doc.deletePage(1);
            doc.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'l' : 'p');
        }

        doc.addImage(imageData, 'JPEG', 0, 0, viewport.width, viewport.height);
    }

    return doc.output('blob');
}

/**
 * Compress an image by reducing quality
 * @param {File} file 
 * @param {string} format 'image/jpeg' or 'image/png'
 * @param {number} quality Compression quality (0.1 to 1.0)
 * @returns {Promise<Blob>}
 */
export async function compressImage(file, format, quality = 0.6) {
    const dataUrl = await fileToDataURL(file);
    const img = new Image();
    img.src = dataUrl;
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const resultDataUrl = canvas.toDataURL(format, quality);
    return dataURLtoBlob(resultDataUrl);
}

/**
 * Convert JPG to WebP
 * @param {File} file 
 * @returns {Promise<Blob>}
 */
export async function convertToWebP(file) {
    const dataUrl = await fileToDataURL(file);
    const img = new Image();
    img.src = dataUrl;
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const resultDataUrl = canvas.toDataURL('image/webp', 0.8);
    return dataURLtoBlob(resultDataUrl);
}


// Helpers
function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function dataURLtoBlob(dataURL) {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
}
