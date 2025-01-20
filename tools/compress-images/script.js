// 工具函数：格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

class ImageCompressorApp {
    constructor() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.imageList = document.getElementById('imageListBody');
        this.template = document.getElementById('imageItemTemplate');
        
        // 质量控制相关元素
        this.qualityButtons = document.querySelectorAll('.format-button[data-quality]');
        
        // 格式选择相关元素
        this.formatButtons = document.querySelectorAll('.format-button[data-format]');
        
        // 当前设置
        this.currentQuality = 0.8;
        this.currentFormat = 'original'; // 默认使用原格式
        
        // 存储原始文件
        this.imageFiles = new WeakMap();
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        // 文件选择
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.handleFiles(Array.from(e.target.files));
            }
        });
        
        // 拖放处理
        this.dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.dropZone.classList.contains('drag-over')) {
                this.dropZone.classList.add('drag-over');
            }
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropZone.classList.remove('drag-over');
                if (eventName === 'drop') {
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        this.handleFiles(Array.from(files));
                    }
                }
            });
        });

        // 防止文件被浏览器打开
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.body.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // 质量按钮点击事件
        this.qualityButtons.forEach(button => {
            button.addEventListener('click', () => {
                // 移除其他按钮的激活状态
                this.qualityButtons.forEach(btn => btn.classList.remove('active'));
                // 激活当前按钮
                button.classList.add('active');
                // 更新当前质量值
                this.currentQuality = parseFloat(button.dataset.quality);
            });
        });

        // 格式选择按钮点击事件
        this.formatButtons.forEach(button => {
            button.addEventListener('click', () => {
                // 移除其他按钮的激活状态
                this.formatButtons.forEach(btn => btn.classList.remove('active'));
                // 激活当前按钮
                button.classList.add('active');
                // 更新当前格式
                this.currentFormat = button.dataset.format;
                // 更新所有已添加图片的输出格式显示
                this.updateAllItemsFormat();
            });
        });

        // 压缩全部按钮点击事件
        document.getElementById('compressAllBtn').addEventListener('click', () => {
            const allItems = Array.from(document.querySelectorAll('#imageListBody tr'));
            
            allItems.forEach(row => {
                const recompressBtn = row.querySelector('.recompress-btn');
                if (recompressBtn) {
                    recompressBtn.click();
                }
            });
        });

        // 下载全部按钮点击事件
        document.getElementById('downloadAllBtn').addEventListener('click', async () => {
            const compressedItems = Array.from(document.querySelectorAll('#imageListBody tr')).filter(row => {
                const downloadBtn = row.querySelector('.download-btn');
                return !downloadBtn.classList.contains('hidden');
            });

            if (compressedItems.length === 0) {
                alert('没有可下载的压缩图片');
                return;
            }

            // 如果只有一个文件，直接下载
            if (compressedItems.length === 1) {
                compressedItems[0].querySelector('.download-btn').click();
                return;
            }

            // 如果有多个文件，使用 JSZip 打包下载
            const zip = new JSZip();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            for (const item of compressedItems) {
                const filename = item.querySelector('.filename').textContent;
                const downloadUrl = item.querySelector('.download-btn').dataset.downloadUrl;
                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                zip.file(filename, blob);
            }

            // 生成并下载 zip 文件
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipUrl = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = `compressed-images-${timestamp}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(zipUrl);
        });

        // 清空列表按钮点击事件
        document.getElementById('clearListBtn').addEventListener('click', () => {
            if (confirm('确定要清空列表吗？')) {
                // 清空图片列表
                this.imageList.innerHTML = '';
                // 隐藏图片列表容器
                document.getElementById('imageListContainer').classList.add('hidden');
                // 清理内存中的图片文件引用
                this.imageFiles = new WeakMap();
            }
        });
    }
    
    handleFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
            // 显示图片列表容器
            document.getElementById('imageListContainer').classList.remove('hidden');
            
            // 添加图片到列表
            imageFiles.forEach(file => {
                this.addImageToList(file);
            });
        }
    }

    // 获取输出格式
    getOutputFormat(file) {
        if (this.currentFormat === 'original') {
            return file.type.split('/')[1];
        }
        return this.currentFormat;
    }

    // 获取输出文件扩展名
    getOutputExtension(format) {
        return format === 'jpeg' ? 'jpg' : format;
    }

    // 更新所有已添加图片的输出格式显示
    updateAllItemsFormat() {
        const items = this.imageList.querySelectorAll('tr');
        items.forEach(item => {
            const formatInfo = item.querySelector('.format-info');
            if (formatInfo) {
                const file = item.dataset.originalFile;
                if (file) {
                    const outputFormat = this.getOutputFormat(JSON.parse(file));
                    formatInfo.textContent = `-> ${outputFormat.toUpperCase()}`;
                }
            }
        });
    }

    addImageToList(file) {
        // 创建新的图片项
        const item = this.template.content.cloneNode(true).children[0];
        this.imageList.insertBefore(item, this.imageList.firstChild);
        this.imageFiles.set(item, file);

        // 存储原始文件信息
        item.dataset.originalFile = JSON.stringify({
            name: file.name,
            type: file.type,
            size: file.size
        });

        // 获取需要更新的元素
        const preview = item.querySelector('img.preview');
        const filename = item.querySelector('.filename');
        const dimensions = item.querySelector('.image-dimensions');
        const originalSize = item.querySelector('.original-size');
        const compressedSize = item.querySelector('.compressed-size');
        const compressionRatio = item.querySelector('.compression-ratio');
        const progressBar = item.querySelector('.progress-bar > div');
        const downloadBtn = item.querySelector('.download-btn');
        const recompressBtn = item.querySelector('.recompress-btn');

        // 创建预览URL
        const previewUrl = URL.createObjectURL(file);

        // 设置基本信息
        filename.textContent = file.name;
        const outputFormat = this.getOutputFormat(file);
        filename.innerHTML = `${file.name} <span class="format-info text-gray-500">-> ${outputFormat.toUpperCase()}</span>`;
        originalSize.textContent = formatFileSize(file.size);
        compressedSize.textContent = '等待压缩';
        compressionRatio.textContent = '';
        progressBar.style.width = '0%';

        // 加载图片并获取尺寸
        preview.onload = () => {
            dimensions.textContent = `${preview.naturalWidth} × ${preview.naturalHeight}`;
            URL.revokeObjectURL(previewUrl);
            
            // 开始压缩
            this.compressImage(file, item);
        };

        // 设置预览图片
        preview.src = previewUrl;

        // 重新压缩按钮事件
        recompressBtn.onclick = () => {
            this.compressImage(file, item);
        };
    }

    async compressImage(file, item) {
        // 获取需要更新的元素
        const compressedSize = item.querySelector('.compressed-size');
        const compressionRatio = item.querySelector('.compression-ratio');
        const progressBar = item.querySelector('.progress-bar > div');
        const downloadBtn = item.querySelector('.download-btn');

        // 重置状态
        compressedSize.textContent = '压缩中...';
        compressionRatio.textContent = '';
        progressBar.style.width = '0%';
        downloadBtn.classList.add('hidden');

        try {
            const outputFormat = this.getOutputFormat(file);
            const options = {
                maxSizeMB: 10, // 最大文件大小
                useWebWorker: true, // 使用 Web Worker
                initialQuality: this.currentQuality, // 初始压缩质量
                fileType: `image/${outputFormat}`, // 输出格式
                onProgress: (progress) => {
                    // 更新进度条
                    progressBar.style.width = `${progress * 100}%`;
                }
            };

            // PNG 格式的特殊处理
            if (outputFormat === 'png') {
                // 根据质量设置颜色数量和抖色系数
                const qualitySettings = {
                    0.8: { colors: 256, dithering: 0 },    // 无损
                    0.6: { colors: 256, dithering: 0.5 },  // 最高画质
                    0.4: { colors: 128, dithering: 0.8 },  // 高画质
                    0.2: { colors: 64, dithering: 1 },     // 中画质
                    0.1: { colors: 32, dithering: 1 },     // 低画质
                    0.05: { colors: 16, dithering: 1 }     // 极低画质
                };

                const settings = qualitySettings[this.currentQuality] || { colors: 256, dithering: 0 };
                options.numColors = settings.colors;         // 颜色数量
                options.dithering = settings.dithering;     // 抖色系数
            }

            // 压缩图片
            const compressedFile = await imageCompression(file, options);
            
            // 更新压缩结果
            const ratio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
            compressedSize.textContent = formatFileSize(compressedFile.size);
            compressionRatio.textContent = ratio > 0 ? `${ratio}%` : '无变化';
            progressBar.style.width = '100%';
            
            // 显示下载按钮
            downloadBtn.classList.remove('hidden');
            
            // 设置下载事件
            downloadBtn.onclick = () => {
                const downloadUrl = URL.createObjectURL(compressedFile);
                const link = document.createElement('a');
                link.href = downloadUrl;
                const ext = this.getOutputExtension(outputFormat);
                link.download = `compressed_${file.name.replace(/\.[^/.]+$/, '')}.${ext}`;
                link.click();
                URL.revokeObjectURL(downloadUrl);
            };

        } catch (error) {
            console.error('压缩失败:', error);
            compressedSize.textContent = '压缩失败';
            compressionRatio.textContent = '';
            progressBar.style.width = '0%';
        }
    }
}

// 初始化应用
new ImageCompressorApp(); 