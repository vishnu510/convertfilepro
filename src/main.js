import './style.css';
import {
    imagesToPdf,
    pdfToImages,
    convertImageFormat,
    compressPdf,
    compressImage,
    convertToWebP
} from './utils/converter.js';

// Main UI Logic
const modalContainer = document.getElementById('modal-container');
const closeModalBtn = document.getElementById('close-modal');
const toolCards = document.querySelectorAll('.tool-card');
const modalTitle = document.getElementById('modal-title');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileListContainer = document.getElementById('file-list-container');
const fileList = document.getElementById('file-list');
const convertBtn = document.getElementById('convert-btn');
const processingContainer = document.getElementById('processing-container');
const resultContainer = document.getElementById('result-container');
const progressFill = document.getElementById('progress-fill');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

const qualitySelector = document.getElementById('quality-selector');
const qualityRange = document.getElementById('quality-range');
const qualityValueDisplay = document.getElementById('quality-value');

const proLimitModal = document.getElementById('pro-limit-modal');
const closeLimitModalBtn = document.getElementById('close-limit-modal');
const continueFreeBtn = document.getElementById('continue-free');

const FREE_SIZE_LIMIT = 20 * 1024 * 1024; // 20MB

// Mobile Menu Logic
const menuToggle = document.getElementById('menu-toggle');
const navContainer = document.getElementById('nav-container');
const navLinks = document.querySelectorAll('.nav-link');

menuToggle.addEventListener('click', () => {
    navContainer.classList.toggle('active');
    menuToggle.classList.toggle('nav-active');
});

// Close menu when clicking a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navContainer.classList.remove('active');
        menuToggle.classList.remove('nav-active');
    });
});

let currentTool = '';
let uploadedFiles = [];
let resultBlob = null;
let resultFileName = '';
let currentQuality = 0.7;

// Tool selection
toolCards.forEach(card => {
    card.addEventListener('click', () => {
        currentTool = card.getAttribute('data-type');
        modalTitle.textContent = card.querySelector('.tool-name').textContent;

        // Show/Hide quality selector for compression tools
        if (currentTool.includes('compress')) {
            qualitySelector.classList.remove('hidden');
            convertBtn.textContent = 'Compress Files';
            resetBtn.textContent = 'Compress More';
            // Set default qualities based on tool
            if (currentTool === 'compress-pdf') {
                qualityRange.value = 40;
                currentQuality = 0.4;
            } else {
                qualityRange.value = 70;
                currentQuality = 0.7;
            }
            qualityValueDisplay.textContent = `${qualityRange.value}%`;
        } else {
            qualitySelector.classList.add('hidden');
            convertBtn.textContent = 'Convert Files';
            resetBtn.textContent = 'Convert More';
        }

        // Set file type restrictions
        const acceptMapping = {
            'jpg-to-pdf': '.jpg,.jpeg',
            'pdf-to-jpg': '.pdf',
            'png-to-jpg': '.png',
            'jpg-to-png': '.jpg,.jpeg',
            'compress-pdf': '.pdf',
            'compress-jpg': '.jpg,.jpeg',
            'compress-png': '.png',
            'jpg-to-webp': '.jpg,.jpeg'
        };
        fileInput.accept = acceptMapping[currentTool] || '';

        openModal();
    });
});

// Quality slider change
qualityRange.addEventListener('input', (e) => {
    const value = e.target.value;
    qualityValueDisplay.textContent = `${value}%`;
    currentQuality = value / 100;
});

function openModal() {
    modalContainer.classList.remove('hidden');
    resetUI();
}

function closeModal() {
    modalContainer.classList.add('hidden');
    resetUI();
}

closeLimitModalBtn.addEventListener('click', () => {
    proLimitModal.classList.add('hidden');
});

continueFreeBtn.addEventListener('click', () => {
    proLimitModal.classList.add('hidden');
});

proLimitModal.addEventListener('click', (e) => {
    if (e.target === proLimitModal) proLimitModal.classList.add('hidden');
});

closeModalBtn.addEventListener('click', closeModal);
modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) closeModal();
});

function resetUI() {
    uploadedFiles = [];
    resultBlob = null;
    resultFileName = '';
    fileList.innerHTML = '';
    fileListContainer.classList.add('hidden');
    dropZone.classList.remove('hidden');
    processingContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    fileInput.value = '';
    progressFill.style.width = '0%';
}

// Drag & Drop Logic
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    const filesArray = Array.from(files);
    const hasLargeFiles = filesArray.some(file => file.size > FREE_SIZE_LIMIT);

    if (hasLargeFiles) {
        proLimitModal.classList.remove('hidden');
        // Filter out large files for free users
        uploadedFiles = filesArray.filter(file => file.size <= FREE_SIZE_LIMIT);
    } else {
        uploadedFiles = filesArray;
    }

    if (uploadedFiles.length > 0) {
        updateFileList();
        dropZone.classList.add('hidden');
        fileListContainer.classList.remove('hidden');
    } else if (hasLargeFiles) {
        // If all files were large and removed
        resetUI();
    }
}

function updateFileList() {
    fileList.innerHTML = '';
    uploadedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `
            <span class="file-name">${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            <button class="remove-file" data-index="${index}">&times;</button>
        `;
        fileList.appendChild(li);
    });

    document.querySelectorAll('.remove-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            uploadedFiles.splice(index, 1);
            if (uploadedFiles.length === 0) {
                resetUI();
            } else {
                updateFileList();
            }
        });
    });
}

// Conversion Interaction
convertBtn.addEventListener('click', async () => {
    if (uploadedFiles.length === 0) return;

    fileListContainer.classList.add('hidden');
    processingContainer.classList.remove('hidden');

    progressFill.style.width = '30%';

    try {
        switch (currentTool) {
            case 'jpg-to-pdf':
                resultBlob = await imagesToPdf(uploadedFiles);
                resultFileName = 'converted.pdf';
                break;
            case 'pdf-to-jpg':
                resultBlob = await pdfToImages(uploadedFiles[0]);
                resultFileName = resultBlob.type === 'application/zip' ? 'converted_images.zip' : 'page.jpg';
                break;
            case 'png-to-jpg':
                resultBlob = await convertImageFormat(uploadedFiles[0], 'image/jpeg');
                resultFileName = uploadedFiles[0].name.replace('.png', '.jpg');
                break;
            case 'jpg-to-png':
                resultBlob = await convertImageFormat(uploadedFiles[0], 'image/png');
                resultFileName = uploadedFiles[0].name.replace('.jpg', '.png');
                break;
            case 'compress-pdf':
                resultBlob = await compressPdf(uploadedFiles[0], currentQuality);
                resultFileName = 'compressed.pdf';
                break;
            case 'compress-jpg':
                resultBlob = await compressImage(uploadedFiles[0], 'image/jpeg', currentQuality);
                resultFileName = 'compressed.jpg';
                break;
            case 'compress-png':
                resultBlob = await compressImage(uploadedFiles[0], 'image/png', currentQuality);
                resultFileName = 'compressed.png';
                break;
            case 'jpg-to-webp':
                resultBlob = await convertToWebP(uploadedFiles[0]);
                resultFileName = uploadedFiles[0].name.replace('.jpg', '.webp');
                break;
        }

        progressFill.style.width = '100%';
        setTimeout(() => {
            processingContainer.classList.add('hidden');
            resultContainer.classList.remove('hidden');
        }, 500);

    } catch (error) {
        console.error('Conversion failed:', error);
        alert(`An error occurred: ${error.message || 'Please try again.'}`);
        resetUI();
    }
});

downloadBtn.addEventListener('click', () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

resetBtn.addEventListener('click', resetUI);
