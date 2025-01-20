class ColorPicker {
    constructor() {
        this.colorThief = new ColorThief();
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.gallery = document.getElementById('gallery');
        this.toast = document.getElementById('toast');
        
        this.initEventListeners();
    }

    initEventListeners() {
        // 文件选择事件
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.handleFiles(Array.from(e.target.files));
            }
        });

        // 点击上传区域
        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        // 拖放事件
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('border-blue-500', 'bg-blue-50');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            this.handleFiles(Array.from(e.dataTransfer.files));
        });

        // 粘贴事件
        document.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            const imageFiles = [];
            
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    imageFiles.push(file);
                }
            }
            
            if (imageFiles.length > 0) {
                this.handleFiles(imageFiles);
            }
        });
    }

    // RGB 转 HEX
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    // 调整颜色亮度
    adjustColor(color, factor) {
        return color.map(channel => Math.min(255, Math.max(0, channel + factor)));
    }

    // 计算文字颜色（黑色或白色）
    calculateTextColor(rgbArr) {
        const brightness = 0.213 * rgbArr[0] + 0.715 * rgbArr[1] + 0.072 * rgbArr[2];
        return brightness > 255 / 2 ? '#000000' : '#ffffff';
    }

    // 复制颜色值到剪贴板
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast(`颜色 ${text} 已复制到剪贴板`);
        }).catch(() => {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                this.showToast(`颜色 ${text} 已复制到剪贴板`);
            } catch (err) {
                this.showToast(`复制失败，请手动复制`);
            }
            document.body.removeChild(textarea);
        });
    }

    // 显示提示信息
    showToast(message) {
        this.toast.textContent = message;
        this.toast.classList.add('toast-show');
        
        setTimeout(() => {
            this.toast.classList.remove('toast-show');
        }, 3000);
    }

    // 处理单个图片
    async displayImageWithColor(file) {
        try {
            // 使用 FileReader 读取图片
            const imageData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });

            const img = await this.loadImage(imageData);
            
            // 获取主色调
            const dominantColor = this.colorThief.getColor(img);
            const hexColor = this.rgbToHex(dominantColor[0], dominantColor[1], dominantColor[2]);

            // 计算明暗变体
            const lighterColor = this.adjustColor(dominantColor, 25);
            const lighterHex = this.rgbToHex(lighterColor[0], lighterColor[1], lighterColor[2]);

            const darkerColor = this.adjustColor(dominantColor, -25);
            const darkerHex = this.rgbToHex(darkerColor[0], darkerColor[1], darkerColor[2]);

            // 创建展示容器
            const container = document.createElement('div');
            container.className = CLASSES.imageContainer;

            // 添加图片预览
            const imgElement = document.createElement('img');
            imgElement.src = imageData; // 使用 base64 数据
            imgElement.alt = '上传的图片';
            imgElement.className = CLASSES.image;

            // 创建颜色信息区域
            const colorInfo = document.createElement('div');
            colorInfo.className = CLASSES.colorInfo;

            // 添加三个颜色块
            const colors = [
                { hex: lighterHex, rgb: lighterColor, label: '明亮' },
                { hex: hexColor, rgb: dominantColor, label: '主色' },
                { hex: darkerHex, rgb: darkerColor, label: '暗色' }
            ];

            colors.forEach(color => {
                const colorBox = document.createElement('div');
                colorBox.className = CLASSES.colorBox;
                colorBox.style.backgroundColor = color.hex;
                colorBox.style.color = this.calculateTextColor(color.rgb);

                const text = document.createElement('span');
                text.className = CLASSES.colorBoxText;
                text.textContent = color.hex;

                const overlay = document.createElement('span');
                overlay.className = CLASSES.colorBoxOverlay;
                overlay.textContent = '点击复制';

                colorBox.appendChild(text);
                colorBox.appendChild(overlay);
                colorBox.onclick = () => this.copyToClipboard(color.hex);
                colorInfo.appendChild(colorBox);
            });

            container.appendChild(imgElement);
            container.appendChild(colorInfo);
            this.gallery.appendChild(container);
        } catch (error) {
            console.error('处理图片时出错:', error);
            this.showToast('处理图片时出错，请重试');
        }
    }

    // 加载图片
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = url;
        });
    }

    // 处理多个文件
    handleFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            this.showToast('请选择图片文件');
            return;
        }

        imageFiles.forEach(file => {
            this.displayImageWithColor(file);
        });
    }
}

// 创建实例
const colorPicker = new ColorPicker(); 