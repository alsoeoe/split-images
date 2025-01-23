class QRCodeGenerator {
    constructor() {
        // 确保 QRCode 库已加载
        if (typeof QRCode === 'undefined') {
            console.error('QRCode 库未加载');
            this.showMessage('QRCode 库加载失败，请刷新页面重试', 'error');
            return;
        }

        console.log('依赖库加载成功');
        this.initElements();
        this.initEventListeners();
        this.qrcode = null;
        this.isGenerating = false;
        this.generateQRCode();
    }

    initElements() {
        // 输入元素
        this.qrContent = document.getElementById('qrContent');
        this.logoFile = document.getElementById('logoFile');
        this.logoSize = document.getElementById('logoSize');
        this.errorLevel = document.getElementById('errorLevel');
        this.removeLogo = document.getElementById('removeLogo');

        // 预览元素
        this.qrCanvas = document.getElementById('qrCanvas');
        this.logoPreview = document.getElementById('logoPreview');
        
        // 下载按钮
        this.downloadSmall = document.getElementById('downloadSmall');
        this.downloadLarge = document.getElementById('downloadLarge');

        // 当前 Logo
        this.currentLogo = null;

        // 创建加载指示器
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'loading-indicator hidden';
        this.loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">生成中...</div>
        `;
        this.qrCanvas.parentNode.appendChild(this.loadingIndicator);
    }

    initEventListeners() {
        // 输入变化时重新生成
        const updateElements = [
            this.qrContent,
            this.logoSize,
            this.errorLevel
        ];

        updateElements.forEach(element => {
            element.addEventListener('input', () => this.generateQRCode());
        });

        // Logo 相关事件
        this.logoFile.addEventListener('change', () => this.handleLogoUpload());
        this.removeLogo.addEventListener('click', () => this.handleRemoveLogo());

        // 下载事件
        this.downloadSmall.addEventListener('click', () => this.downloadQRCode(512));
        this.downloadLarge.addEventListener('click', () => this.downloadQRCode(1024));
    }

    // 显示/隐藏加载状态
    setLoading(loading) {
        this.isGenerating = loading;
        if (loading) {
            this.loadingIndicator.classList.remove('hidden');
            this.qrCanvas.classList.add('generating');
        } else {
            this.loadingIndicator.classList.add('hidden');
            this.qrCanvas.classList.remove('generating');
        }
    }

    async generateQRCode() {
        if (typeof QRCode === 'undefined' || this.isGenerating) {
            return;
        }

        this.setLoading(true);

        // 计算合适的版本
        const content = this.qrContent.value || 'Hello, World!';
        
        // 对于 URL 编码的内容，先解码再计算长度
        let decodedContent;
        try {
            decodedContent = decodeURIComponent(content);
        } catch (e) {
            decodedContent = content;
        }
        
        const length = decodedContent.length;
        let typeNumber = 40; // 使用最大版本

        // 定义纠错级别顺序，从高到低
        const correctionLevels = [
            { level: 'H', threshold: 1000 },
            { level: 'Q', threshold: 1500 },
            { level: 'M', threshold: 2000 },
            { level: 'L', threshold: Infinity }
        ];

        // 根据内容长度选择合适的纠错级别
        let selectedLevel = this.errorLevel.value;
        const initialLevelIndex = correctionLevels.findIndex(l => l.level === selectedLevel);

        // 尝试生成二维码，如果失败则降级
        for (let i = initialLevelIndex; i < correctionLevels.length; i++) {
            const currentLevel = correctionLevels[i];
            
            if (length > currentLevel.threshold && i < correctionLevels.length - 1) {
                continue; // 如果内容超过阈值，直接尝试下一个级别
            }

            try {
                const options = {
                    text: content,
                    width: 400,
                    height: 400,
                    colorDark: '#000000',
                    colorLight: '#FFFFFF',
                    correctLevel: QRCode.CorrectLevel[currentLevel.level],
                    typeNumber: typeNumber,
                    utf8: true
                };

                // 清除旧的二维码
                if (this.qrcode) {
                    this.qrcode.clear();
                    this.qrCanvas.innerHTML = '';
                }

                // 生成新的二维码
                await new Promise((resolve, reject) => {
                    try {
                        this.qrcode = new QRCode(this.qrCanvas, options);
                        // 等待图片加载完成
                        const img = this.qrCanvas.querySelector('img');
                        if (img) {
                            img.onload = resolve;
                            img.onerror = reject;
                        } else {
                            resolve();
                        }
                    } catch (error) {
                        reject(error);
                    }
                });

                // 如果纠错级别被降级，更新选择框并提示用户
                if (currentLevel.level !== selectedLevel) {
                    this.errorLevel.value = currentLevel.level;
                    this.showMessage(`内容较长，已自动调整为${this.getCorrectionLevelName(currentLevel.level)}纠错级别`, 'info');
                }

                // 如果有 Logo，添加到中心
                if (this.currentLogo) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    this.addLogoToQRCode();
                }

                break; // 生成成功，退出循环
            } catch (error) {
                console.error(`使用 ${currentLevel.level} 级别生成失败:`, error);
                
                if (i === correctionLevels.length - 1) {
                    // 所有级别都尝试失败
                    this.showMessage('内容过长，请尝试缩短内容', 'error');
                    break;
                }
            }
        }

        this.setLoading(false);
    }

    // 获取纠错级别的中文名称
    getCorrectionLevelName(level) {
        const names = {
            'L': '低',
            'M': '中等',
            'Q': '较高',
            'H': '高'
        };
        return names[level] || level;
    }

    addLogoToQRCode() {
        if (!this.currentLogo) return;

        const qrImage = this.qrCanvas.querySelector('img');
        if (!qrImage) return;

        const canvas = document.createElement('canvas');
        const size = 1024; // 使用高分辨率
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // 启用抗锯齿
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 绘制二维码
        ctx.drawImage(qrImage, 0, 0, size, size);

        // 在中心绘制 Logo
        const logoSize = size * (parseInt(this.logoSize.value) / 100);
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;

        // 创建圆角矩形路径
        const radius = logoSize * 0.15; // Logo 圆角半径
        ctx.beginPath();
        ctx.moveTo(logoX + radius, logoY);
        ctx.lineTo(logoX + logoSize - radius, logoY);
        ctx.quadraticCurveTo(logoX + logoSize, logoY, logoX + logoSize, logoY + radius);
        ctx.lineTo(logoX + logoSize, logoY + logoSize - radius);
        ctx.quadraticCurveTo(logoX + logoSize, logoY + logoSize, logoX + logoSize - radius, logoY + logoSize);
        ctx.lineTo(logoX + radius, logoY + logoSize);
        ctx.quadraticCurveTo(logoX, logoY + logoSize, logoX, logoY + logoSize - radius);
        ctx.lineTo(logoX, logoY + radius);
        ctx.quadraticCurveTo(logoX, logoY, logoX + radius, logoY);
        ctx.closePath();

        // 清除 Logo 区域的二维码
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // 添加白色边框
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 8;
        ctx.stroke();

        try {
            // 在圆角矩形内绘制 Logo
            ctx.save();
            ctx.clip();
            ctx.drawImage(this.currentLogo, logoX, logoY, logoSize, logoSize);
            ctx.restore();

            // 更新二维码图片并设置预览大小
            qrImage.src = canvas.toDataURL('image/png');
            qrImage.style.width = '400px';
            qrImage.style.height = '400px';
        } catch (error) {
            console.error('绘制 Logo 失败:', error);
            this.showMessage('绘制 Logo 失败，请重试', 'error');
        }
    }

    async downloadQRCode(targetSize = 512) {
        if (!this.qrContent.value) {
            this.showMessage('请先输入二维码内容', 'error');
            return;
        }

        try {
            const qrImage = this.qrCanvas.querySelector('img');
            if (!qrImage) {
                throw new Error('二维码图片未生成');
            }

            // 创建一个临时画布来调整大小
            const canvas = document.createElement('canvas');
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');

            // 启用抗锯齿
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // 绘制调整大小后的图像
            ctx.drawImage(qrImage, 0, 0, targetSize, targetSize);

            // 下载图片
            const link = document.createElement('a');
            link.download = `qrcode_${targetSize}x${targetSize}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            this.showMessage('下载成功', 'success');
        } catch (error) {
            console.error('下载失败:', error);
            this.showMessage('下载失败: ' + error.message, 'error');
        }
    }

    handleLogoUpload() {
        const file = this.logoFile.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showMessage('请选择图片文件', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentLogo = img;
                this.generateQRCode();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleRemoveLogo() {
        this.currentLogo = null;
        this.logoFile.value = '';
        this.generateQRCode();
    }

    showMessage(text, type = 'info') {
        const message = document.createElement('div');
        message.className = `message ${type} animate-fade-in`;
        message.textContent = text;
        document.body.appendChild(message);

        setTimeout(() => {
            message.classList.add('animate-fade-out');
            setTimeout(() => {
                document.body.removeChild(message);
            }, 300);
        }, 3000);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new QRCodeGenerator();
}); 