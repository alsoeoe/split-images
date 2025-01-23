class RemoveBgTool {
    constructor() {
        this.apiKeys = [
            'gHA4QdyS23izLbUYcbnBgCsp',
            'jtf874jzTfriAvfkvXK2VtB8',
            'UeGL6e1PgnG5HjaBd4zsCyvQ',
            'cr2bvYT674rdtHd6zazs64CW',
            'tvJURXvQD31ozMz1UWoiCjCv',
            '27865ZdbAFbPpoMuor6kxwMy',
            'HJDZMSwexN6iQJy4Uw7pAnwH',
            '1ArJ5xby2JBnb5nTWnHV1Z8M'
        ]; // 默认 API Keys
        this.currentKeyIndex = 0;
        this.queue = [];
        this.processing = false;
        this.processedImages = [];
        this.maxImages = 50;
        this.maxRetries = 3; // 最大重试次数
        this.retryDelay = 1000; // 重试延迟（毫秒）
        this.keyQuota = {}; // 记录每个 key 的使用次数
        
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.apiKeysInput = document.getElementById('apiKeys');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.resultGrid = document.getElementById('resultGrid');
        this.downloadContainer = document.getElementById('downloadContainer');
        this.downloadAllBtn = document.getElementById('downloadAll');
        this.previewModal = document.getElementById('previewModal');
        this.previewImage = document.getElementById('previewImage');
        this.closePreviewBtn = document.getElementById('closePreviewBtn');
    }

    initEventListeners() {
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('border-blue-500/50');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('border-blue-500/50');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('border-blue-500/50');
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            this.addImagesToQueue(files);
        });

        this.fileInput.addEventListener('change', () => {
            const files = Array.from(this.fileInput.files);
            this.addImagesToQueue(files);
            this.fileInput.value = '';
        });

        document.addEventListener('paste', (e) => {
            const items = Array.from(e.clipboardData.items);
            const imageItems = items.filter(item => item.type.startsWith('image/'));
            const files = imageItems.map(item => item.getAsFile());
            if (files.length > 0) {
                this.addImagesToQueue(files);
            }
        });

        this.settingsBtn.addEventListener('click', () => {
            this.settingsModal.classList.remove('hidden');
            this.settingsModal.classList.add('flex');
            this.apiKeysInput.value = this.apiKeys.join('\n');
        });

        this.closeSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
        this.cancelSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
        
        this.saveSettingsBtn.addEventListener('click', () => {
            const keys = this.apiKeysInput.value.split('\n').map(key => key.trim()).filter(key => key);
            if (keys.length > 0) {
                this.apiKeys = keys;
                this.currentKeyIndex = 0;
                this.showMessage('API Keys 已保存', 'success');
            } else {
                this.showMessage('请至少输入一个有效的 API Key', 'error');
                return;
            }
            this.closeSettingsModal();
        });

        this.downloadAllBtn.addEventListener('click', () => this.downloadAllImages());

        this.closePreviewBtn.addEventListener('click', () => this.closePreviewModal());
        this.previewModal.addEventListener('click', (e) => {
            if (e.target === this.previewModal) {
                this.closePreviewModal();
            }
        });
    }

    closeSettingsModal() {
        this.settingsModal.classList.add('hidden');
        this.settingsModal.classList.remove('flex');
    }

    closePreviewModal() {
        this.previewModal.classList.add('hidden');
        this.previewModal.classList.remove('flex');
    }

    showPreview(imageUrl) {
        this.previewImage.src = imageUrl;
        this.previewModal.classList.remove('hidden');
        this.previewModal.classList.add('flex');
    }

    addImagesToQueue(files) {
        if (this.queue.length + files.length > this.maxImages) {
            this.showMessage(`一次最多处理 ${this.maxImages} 张图片`, 'error');
            return;
        }

        for (const file of files) {
            if (file.size > 12 * 1024 * 1024) {
                this.showMessage(`图片 ${file.name} 超过 12MB 限制`, 'error');
                continue;
            }
            this.queue.push(file);
        }

        if (!this.processing) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.queue.length === 0 || this.processing) return;

        this.processing = true;
        this.progressContainer.classList.remove('hidden');
        this.updateProgress();

        while (this.queue.length > 0) {
            const file = this.queue.shift();
            try {
                const result = await this.processImageWithRetry(file);
                if (result) {
                    this.processedImages.push({
                        original: file,
                        processed: result,
                        name: file.name
                    });
                    this.addImageToGrid(result, file.name);
                }
            } catch (error) {
                console.error('处理图片失败:', error);
                this.showMessage(`处理图片 ${file.name} 失败: ${error.message}`, 'error');
                
                // 如果是所有 key 都用完了，中断处理
                if (error.message === '所有 API Keys 额度已用尽') {
                    this.showQuotaExhaustedMessage();
                    break;
                }
            }
            this.updateProgress();
        }

        this.processing = false;
        if (this.processedImages.length > 0) {
            this.downloadContainer.classList.remove('hidden');
        }
    }

    async processImageWithRetry(file, retryCount = 0) {
        try {
            return await this.processImage(file);
        } catch (error) {
            if (error.message === '所有 API Keys 额度已用尽') {
                throw error;
            }
            
            if (retryCount < this.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.processImageWithRetry(file, retryCount + 1);
            }
            throw error;
        }
    }

    async processImage(file) {
        const formData = new FormData();
        formData.append('image_file', file);
        formData.append('size', 'auto');

        const apiKey = this.apiKeys[this.currentKeyIndex];
        
        try {
            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: {
                    'X-Api-Key': apiKey
                },
                body: formData
            });

            if (response.ok) {
                // 记录 key 使用次数
                this.keyQuota[apiKey] = (this.keyQuota[apiKey] || 0) + 1;
                const blob = await response.blob();
                return URL.createObjectURL(blob);
            } else {
                const error = await response.json();
                if (response.status === 402) {
                    // 标记当前 key 额度已用完
                    this.keyQuota[apiKey] = 50;
                    
                    // 检查是否所有 key 都用完了
                    const allKeysExhausted = this.apiKeys.every(key => (this.keyQuota[key] || 0) >= 50);
                    if (allKeysExhausted) {
                        throw new Error('所有 API Keys 额度已用尽');
                    }

                    // 切换到下一个未用完的 key
                    this.switchToNextAvailableKey();
                    return this.processImage(file);
                }
                throw new Error(error.message || '处理失败');
            }
        } catch (error) {
            throw error;
        }
    }

    switchToNextAvailableKey() {
        const startIndex = this.currentKeyIndex;
        do {
            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
            // 如果遍历了一圈还没找到可用的 key
            if (this.currentKeyIndex === startIndex) {
                throw new Error('所有 API Keys 额度已用尽');
            }
        } while ((this.keyQuota[this.apiKeys[this.currentKeyIndex]] || 0) >= 50);
    }

    showQuotaExhaustedMessage() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
                <div class="p-6">
                    <div class="flex items-center justify-center mb-4">
                        <svg class="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-center mb-2">API 额度已用尽</h3>
                    <p class="text-gray-600 text-center mb-6">所有 API Keys 的每日处理额度已用完，请明天再试。</p>
                    <div class="flex justify-center">
                        <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            知道了
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const closeBtn = modal.querySelector('button');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    addImageToGrid(imageUrl, fileName) {
        if (this.processedImages.length === 1) {
            this.resultGrid.innerHTML = '';
        }

        const card = document.createElement('div');
        card.className = 'bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md group';
        
        const imageContainer = document.createElement('div');
        imageContainer.className = 'relative aspect-square overflow-hidden cursor-pointer';
        imageContainer.innerHTML = `
            <div class="absolute inset-0 bg-[#f0f0f0]"></div>
            <img src="${imageUrl}" alt="${fileName}" class="relative w-full h-full object-contain p-2">
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </div>
        `;
        imageContainer.addEventListener('click', () => this.showPreview(imageUrl));

        const footer = document.createElement('div');
        footer.className = 'p-1.5 flex items-center justify-between border-t border-gray-100 bg-gray-50/50';
        footer.innerHTML = `
            <div class="truncate text-xs text-gray-600 flex-1 px-1">${fileName}</div>
            <button class="download-btn p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
            </button>
        `;

        const downloadBtn = footer.querySelector('.download-btn');
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.downloadImage(imageUrl, fileName);
        });

        card.appendChild(imageContainer);
        card.appendChild(footer);
        this.resultGrid.appendChild(card);
    }

    updateProgress() {
        const total = this.processedImages.length + this.queue.length;
        const processed = this.processedImages.length;
        const percentage = total === 0 ? 0 : (processed / total) * 100;
        
        this.progressBar.style.width = `${percentage}%`;
        this.progressText.textContent = `${processed}/${total}`;
        
        if (processed === total && total > 0) {
            setTimeout(() => {
                this.progressContainer.classList.add('hidden');
            }, 1000);
        }
    }

    async downloadAllImages() {
        if (this.processedImages.length === 0) return;

        const zip = new JSZip();
        const promises = this.processedImages.map(async (image, index) => {
            const response = await fetch(image.processed);
            const blob = await response.blob();
            const extension = image.name.split('.').pop();
            const fileName = `${image.name.replace(`.${extension}`, '')}_no_bg.png`;
            zip.file(fileName, blob);
        });

        try {
            await Promise.all(promises);
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'images_no_bg.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('下载失败:', error);
            this.showMessage('创建压缩包失败', 'error');
        }
    }

    downloadImage(url, fileName) {
        const extension = fileName.split('.').pop();
        const newFileName = `${fileName.replace(`.${extension}`, '')}_no_bg.png`;
        const link = document.createElement('a');
        link.href = url;
        link.download = newFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showMessage(message, type = 'info') {
        const colors = {
            error: 'bg-red-500',
            success: 'bg-green-500',
            info: 'bg-blue-500'
        };

        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// 初始化工具
document.addEventListener('DOMContentLoaded', () => {
    new RemoveBgTool();
}); 