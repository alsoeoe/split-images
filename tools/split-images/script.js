class ImageSplitter {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.imageInput = document.getElementById('imageInput');
        this.previewArea = document.getElementById('previewArea');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        
        this.image = null;
        this.lines = [];  // 存储分割线位置 {y: number, dragging: boolean}
        this.verticalSections = new Map(); // 存储每个区域的垂直分割信息 key: sectionIndex, value: {splits: number}
        this.scale = 1;   // 缩放比例
        this.offsetX = 0; // 平移偏移量
        this.offsetY = 0;
        this.isDragging = false;
        this.isDeleting = false;
        this.activeLineIndex = -1;
        this.lastMouseY = 0;
        
        // 添加空格拖动相关状态
        this.isSpacePressed = false;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        
        // 初始化 Canvas 大小
        this.initCanvasSize();
        this.initEventListeners();
    }

    initCanvasSize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // 绘制初始背景
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 添加窗口大小改变事件监听
        window.addEventListener('resize', () => {
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;
            
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            
            if (this.image) {
                this.draw();
            } else {
                // 如果没有图片，重新绘制白色背景
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        });
    }

    initEventListeners() {
        // 移除原有的上传按钮点击事件，因为现在在提示区域中有新的上传按钮
        this.uploadBtn.addEventListener('click', () => {
            if (this.image) {
                this.imageInput.click();
            }
        });
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.downloadAllBtn.addEventListener('click', () => this.downloadAllSections());
        
        // Canvas 事件
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDblClick.bind(this));

        // 添加键盘事件
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));

        // 添加粘贴事件
        document.addEventListener('paste', this.handlePaste.bind(this));

        // 添加拖拽事件
        const container = this.canvas.parentElement;
        container.addEventListener('dragover', this.handleDragOver.bind(this));
        container.addEventListener('drop', this.handleDrop.bind(this));
        container.addEventListener('dragleave', (e) => {
            if (e.target === container) {
                container.classList.remove('dragging');
            }
        });
    }

    handleKeyDown(e) {
        if (e.code === 'Space' && !this.isSpacePressed) {
            this.isSpacePressed = true;
            this.canvas.style.cursor = 'grab';
        }
    }

    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.isSpacePressed = false;
            this.isPanning = false;
            this.canvas.style.cursor = 'crosshair';
        }
    }

    handlePaste(e) {
        if (this.image) return; // 如果已有图片，不处理粘贴事件
        
        const items = e.clipboardData.items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                this.loadImage(file);
                break;
            }
        }
    }

    handleDragOver(e) {
        if (this.image) return; // 如果已有图片，不处理拖拽事件
        e.preventDefault();
        e.stopPropagation();
        this.canvas.parentElement.classList.add('dragging');
    }

    handleDrop(e) {
        if (this.image) return; // 如果已有图片，不处理拖放事件
        
        e.preventDefault();
        e.stopPropagation();
        this.canvas.parentElement.classList.remove('dragging');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.indexOf('image') !== -1) {
                this.loadImage(file);
            }
        }
    }

    // 添加一个方法来更新提示层的显示状态
    updateDropZoneVisibility() {
        const dropZone = this.canvas.parentElement.querySelector('.drop-zone-hint');
        if (dropZone) {
            dropZone.style.display = this.image ? 'none' : 'flex';
        }
        // 更新重新上传按钮的状态
        if (this.uploadBtn) {
            this.uploadBtn.classList.toggle('opacity-50', !this.image);
            this.uploadBtn.classList.toggle('cursor-not-allowed', !this.image);
            this.uploadBtn.disabled = !this.image;
        }
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.canvas.classList.remove('hidden');
                this.setupCanvas();
                this.resetView();
                this.draw();
                this.updatePreview();
                this.updateDropZoneVisibility(); // 更新提示层显示状态
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.loadImage(file);
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 设置canvas大小为容器大小
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;

        // 清空分割线
        this.lines = [];
    }

    resetView() {
        // 计算缩放比例，使图片适应画布
        const scaleX = this.canvas.width / this.image.width;
        const scaleY = this.canvas.height / this.image.height;
        this.scale = Math.min(scaleX, scaleY) * 0.9; // 留一些边距

        // 居中图片
        this.offsetX = (this.canvas.width - this.image.width * this.scale) / 2;
        this.offsetY = (this.canvas.height - this.image.height * this.scale) / 2;
    }

    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 保存当前状态
        this.ctx.save();
        
        // 应用变换
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);
        
        // 绘制图片
        if (this.image) {
            this.ctx.drawImage(this.image, 0, 0);
        }
        
        // 绘制分割线
        this.lines.forEach((line, index) => {
            this.ctx.beginPath();
            this.ctx.moveTo(0, line.y);
            this.ctx.lineTo(this.image.width, line.y);
            this.ctx.strokeStyle = '#3b82f6';
            this.ctx.lineWidth = 2 / this.scale;
            this.ctx.stroke();

            // 绘制删除按钮
            this.drawDeleteButton(line.y);
        });
        
        // 恢复状态
        this.ctx.restore();
    }

    drawDeleteButton(y) {
        const btnSize = 20 / this.scale;
        const margin = 10 / this.scale;
        const centerX = this.image.width - margin - btnSize/2;
        const centerY = y;
        
        // 绘制圆形背景
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, btnSize/2, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fill();
        
        // 绘制 X
        const xSize = 6 / this.scale; // X 的大小
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - xSize, centerY - xSize);
        this.ctx.lineTo(centerX + xSize, centerY + xSize);
        this.ctx.moveTo(centerX + xSize, centerY - xSize);
        this.ctx.lineTo(centerX - xSize, centerY + xSize);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2 / this.scale;
        this.ctx.stroke();
    }

    // 转换鼠标坐标到图片坐标
    transformCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left - this.offsetX) / this.scale;
        const y = (clientY - rect.top - this.offsetY) / this.scale;
        return { x, y };
    }

    handleMouseDown(e) {
        if (!this.image) return;

        if (this.isSpacePressed) {
            this.isPanning = true;
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        const { x, y } = this.transformCoordinates(e.clientX, e.clientY);

        // 检查是否点击删除按钮
        const btnSize = 20 / this.scale;
        const margin = 10 / this.scale;
        this.lines.forEach((line, index) => {
            const btnX = this.image.width - margin - btnSize/2;
            const btnY = line.y;
            const distance = Math.sqrt(Math.pow(x - btnX, 2) + Math.pow(y - btnY, 2));
            if (distance <= btnSize/2) {
                this.isDeleting = true;
                this.lines.splice(index, 1);
                this.draw();
                this.updatePreview();
                return;
            }
        });

        if (!this.isDeleting) {
            // 检查是否点击分割线
            const lineIndex = this.lines.findIndex(line => 
                Math.abs(line.y - y) < 5/this.scale
            );

            if (lineIndex !== -1) {
                this.isDragging = true;
                this.activeLineIndex = lineIndex;
                this.lastMouseY = y;
            } else if (x >= 0 && x <= this.image.width && y >= 0 && y <= this.image.height) {
                // 在图片范围内点击添加新线
                this.lines.push({ y, dragging: false });
                this.draw();
                // 更新预览并滚动到新添加的位置
                this.updatePreview(y);
            }
        }
    }

    handleMouseMove(e) {
        if (this.isPanning) {
            const deltaX = e.clientX - this.lastPanX;
            const deltaY = e.clientY - this.lastPanY;
            
            this.offsetX += deltaX;
            this.offsetY += deltaY;
            
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            
            this.draw();
            return;
        }

        if (!this.isDragging || this.activeLineIndex === -1) return;

        const { y } = this.transformCoordinates(e.clientX, e.clientY);
        const deltaY = y - this.lastMouseY;

        if (y >= 0 && y <= this.image.height) {
            this.lines[this.activeLineIndex].y = y;
            this.lastMouseY = y;
            this.draw();
            this.updatePreview();
        }
    }

    handleMouseUp() {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = this.isSpacePressed ? 'grab' : 'crosshair';
        }
        this.isDragging = false;
        this.isDeleting = false;
        this.activeLineIndex = -1;
    }

    handleWheel(e) {
        if (!this.image) return;

        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 计算鼠标在图片上的相对位置
        const imgX = (mouseX - this.offsetX) / this.scale;
        const imgY = (mouseY - this.offsetY) / this.scale;
        
        // 计算新的缩放比例
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = this.scale * delta;
        
        // 限制缩放范围
        if (newScale < 0.1 || newScale > 5) return;

        // 更新缩放比例
        this.scale = newScale;

        // 调整偏移量，使缩放以鼠标位置为中心
        this.offsetX = mouseX - imgX * this.scale;
        this.offsetY = mouseY - imgY * this.scale;
        
        this.draw();
    }

    handleDblClick() {
        if (!this.image) return;
        this.resetView();
        this.draw();
    }

    updatePreview(scrollToY = null) {
        if (!this.image) return;

        // 保存当前滚动位置（如果没有指定要滚动到的位置）
        const scrollTop = scrollToY === null ? this.previewArea.scrollTop : null;

        this.previewArea.innerHTML = '';
        
        // 添加原始图片区域到分割线位置的数组
        const positions = [...this.lines.map(line => line.y)].sort((a, b) => a - b);
        positions.unshift(0);
        positions.push(this.image.height);

        // 计算预览区域的最大宽度
        const previewMaxWidth = this.previewArea.clientWidth - 40;

        let accumulatedHeight = 0; // 用于跟踪累积高度
        let targetScrollTop = 0; // 目标滚动位置

        // 为每个分割区域创建预览
        for (let i = 0; i < positions.length - 1; i++) {
            const startY = positions[i];
            const endY = positions[i + 1];
            const height = endY - startY;
            const sectionInfo = this.verticalSections.get(i) || { splits: 1 };
            const splits = sectionInfo.splits;

            // 如果指定了滚动位置，计算目标滚动位置
            if (scrollToY !== null && scrollToY >= startY && scrollToY <= endY) {
                const progress = (scrollToY - startY) / height;
                targetScrollTop = accumulatedHeight + (progress * height * (previewMaxWidth / this.image.width));
            }

            const section = document.createElement('div');
            section.className = 'preview-section';

            // 创建预览容器
            const previewContainer = document.createElement('div');
            previewContainer.className = 'preview-container';

            // 添加尺寸显示
            const sizeDisplay = document.createElement('div');
            sizeDisplay.className = 'preview-size';
            sizeDisplay.textContent = `${Math.round(this.image.width / splits)}×${Math.round(height)}px`;
            previewContainer.appendChild(sizeDisplay);

            // 计算预览图的缩放比例
            const originalWidth = this.image.width;
            const originalHeight = height;
            const containerRatio = previewMaxWidth / originalWidth;
            const scale = Math.min(1, containerRatio);

            const previewWidth = originalWidth * scale;
            const previewHeight = originalHeight * scale;

            accumulatedHeight += previewHeight + 32; // 加上 margin 和 padding

            // 创建垂直分割的预览
            for (let j = 0; j < splits; j++) {
                const canvas = document.createElement('canvas');
                const partWidth = previewWidth / splits;
                
                // 设置画布大小
                canvas.width = partWidth;
                canvas.height = previewHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // 绘制对应区域的图片部分
                ctx.drawImage(
                    this.image,
                    j * (originalWidth / splits), startY,
                    originalWidth / splits, height,
                    0, 0,
                    partWidth, previewHeight
                );

                previewContainer.appendChild(canvas);
            }

            // 创建操作按钮
            const actions = document.createElement('div');
            actions.className = 'actions';
            actions.innerHTML = `
                <button class="${splits > 1 ? '' : 'opacity-50 cursor-not-allowed'}" ${splits > 1 ? '' : 'disabled'}>
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 7h16M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    合并
                </button>
                <button>
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M4 7h6M14 7h6M4 12h6M14 12h6" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    2等分
                </button>
                <button>
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M4 7h4M10 7h4M16 7h4M4 12h4M10 12h4M16 12h4" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    3等分
                </button>
                <button class="download-btn">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 4v13m0 0l-4-4m4 4l4-4m-10 6v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    下载
                </button>
            `;

            // 添加按钮事件监听
            const mergeBtn = actions.querySelector('button:nth-child(1)');
            const split2Btn = actions.querySelector('button:nth-child(2)');
            const split3Btn = actions.querySelector('button:nth-child(3)');
            const downloadBtn = actions.querySelector('.download-btn');

            // 设置当前选中状态
            if (splits === 1) mergeBtn.classList.add('active');
            if (splits === 2) split2Btn.classList.add('active');
            if (splits === 3) split3Btn.classList.add('active');

            // 合并功能
            if (splits > 1) {
                mergeBtn.addEventListener('click', () => {
                    this.verticalSections.set(i, { splits: 1 });
                    this.updatePreview();
                });
            }

            // 2等分功能
            split2Btn.addEventListener('click', () => {
                this.verticalSections.set(i, { splits: 2 });
                this.updatePreview();
            });

            // 3等分功能
            split3Btn.addEventListener('click', () => {
                this.verticalSections.set(i, { splits: 3 });
                this.updatePreview();
            });

            // 下载功能
            downloadBtn.addEventListener('click', () => {
                const zip = new JSZip();
                
                for (let j = 0; j < splits; j++) {
                    const downloadCanvas = document.createElement('canvas');
                    const originalPartWidth = this.image.width / splits;
                    
                    downloadCanvas.width = originalPartWidth;
                    downloadCanvas.height = height;
                    
                    const ctx = downloadCanvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    ctx.drawImage(
                        this.image,
                        j * originalPartWidth, startY,
                        originalPartWidth, height,
                        0, 0,
                        originalPartWidth, height
                    );
                    
                    const partData = downloadCanvas.toDataURL('image/png').split(',')[1];
                    zip.file(`split_${i + 1}_part_${j + 1}.png`, partData, {base64: true});
                }
                
                zip.generateAsync({type: 'blob'}).then(blob => {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `split_${i + 1}_all_parts.zip`;
                    link.click();
                });
            });

            section.appendChild(previewContainer);
            section.appendChild(actions);
            this.previewArea.appendChild(section);
        }

        // 设置滚动位置
        if (scrollToY !== null) {
            targetScrollTop = Math.max(0, targetScrollTop - 100);
            this.previewArea.scrollTop = targetScrollTop;
        } else if (scrollTop !== null) {
            this.previewArea.scrollTop = scrollTop;
        }
    }

    downloadAllSections() {
        if (!this.image) return;

        const zip = new JSZip();
        const positions = [...this.lines.map(line => line.y)].sort((a, b) => a - b);
        positions.unshift(0);
        positions.push(this.image.height);

        // 为每个分割区域创建预览
        for (let i = 0; i < positions.length - 1; i++) {
            const startY = positions[i];
            const endY = positions[i + 1];
            const height = endY - startY;
            const sectionInfo = this.verticalSections.get(i) || { splits: 1 };
            const splits = sectionInfo.splits;

            // 为每个垂直分割创建图片
            for (let j = 0; j < splits; j++) {
                const canvas = document.createElement('canvas');
                const partWidth = this.image.width / splits;
                
                canvas.width = partWidth;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                ctx.drawImage(
                    this.image,
                    j * partWidth, startY,
                    partWidth, height,
                    0, 0,
                    partWidth, height
                );
                
                const partData = canvas.toDataURL('image/png').split(',')[1];
                const fileName = splits > 1 ? 
                    `section_${i + 1}_part_${j + 1}.png` : 
                    `section_${i + 1}.png`;
                zip.file(fileName, partData, {base64: true});
            }
        }
        
        zip.generateAsync({type: 'blob'}).then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'all_sections.zip';
            link.click();
        });
    }
}

// 创建实例
const imageSplitter = new ImageSplitter(); 