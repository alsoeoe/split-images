document.addEventListener('DOMContentLoaded', function() {
    // 清除浏览器缓存
    if (window.caches) {
        caches.keys().then(function(names) {
            names.forEach(function(name) {
                caches.delete(name);
            });
        });
    }
    
    // 清除其他存储
    localStorage.clear();
    sessionStorage.clear();

    // 重置表单
    document.querySelectorAll('form').forEach(form => form.reset());
    
    // 清除文件输入
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.value = '';
    });

    const imageInput = document.getElementById('imageInput');
    const previewContent = document.getElementById('previewContent');
    const urlInput = document.querySelector('input[type="url"]');
    const timeElement = document.getElementById('time');
    const statusBar = document.querySelector('.status-bar');
    const previewModeBtns = document.querySelectorAll('.preview-mode-btn');
    let currentMode = 'banner';
    let swiper = null;

    // 存储所有轮播图片的颜色信息
    let bannerColors = [];
    let currentColorIndex = 0;

    // 计算背景色应该使用的文字颜色
    function resBgColor(rgbArr) {
        const brightness = 0.213 * rgbArr[0] + 0.715 * rgbArr[1] + 0.072 * rgbArr[2];
        return brightness > 255/2 ? '#000000' : '#ffffff';
    }

    // 更新主题颜色
    function updateThemeColor(color = '#4338CA') {
        document.documentElement.style.setProperty('--main-color', color);
        
        // 将十六进制颜色转换为RGB数组
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        const textColor = resBgColor([r, g, b]);
        
        // 更新所有需要使用文字颜色的元素
        const topSection = document.querySelector('.top-section');
        if (topSection) {
            // 设置整个顶部区域的文字颜色
            topSection.style.setProperty('--text-color', textColor);
            topSection.style.color = textColor;

            // 更新搜索框和图标
            const searchInput = topSection.querySelector('.search-input');
            if (searchInput) {
                searchInput.style.color = textColor;
            }

            // 更新所有 SVG 图标
            const svgIcons = topSection.querySelectorAll('svg');
            svgIcons.forEach(svg => {
                svg.style.color = textColor;
            });

            // 更新标签
            const tags = topSection.querySelectorAll('.tag');
            tags.forEach(tag => {
                tag.style.color = textColor;
            });
        }

        // 动态创建或更新样式
        const styleId = 'dynamic-theme-styles';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
            .top-section {
                color: ${textColor};
            }
            .status-bar {
                color: ${textColor};
            }
            .search-input {
                color: ${textColor};
            }
            .search-input::placeholder {
                color: ${textColor};
                opacity: 0.6;
            }
            .tag:not(.active) {
                color: ${textColor};
                opacity: 0.6;
            }
            .tag.active {
                color: ${textColor};
            }
            .top-section svg {
                color: ${textColor};
            }
            .battery-icon {
                border-color: ${textColor};
            }
            .battery-icon::after {
                background-color: ${textColor};
            }
            .battery-level {
                background-color: ${textColor};
            }
        `;
    }

    // 更新时间
    function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timeElement.textContent = `${hours}:${minutes}`;
    }

    // 初始化主题颜色
    updateThemeColor();

    // 初始化 Swiper
    function initSwiper() {
        swiper = new Swiper(".swiper-container", {
            slidesPerView: 'auto',
            spaceBetween: 16,
            centeredSlides: true,
            loop: true,
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            pagination: {
                el: ".swiper-pagination",
                clickable: true,
            },
            on: {
                slideChange: function() {
                    if (bannerColors.length === 0) return;
                    
                    // 计算实际的索引（考虑循环）
                    const realIndex = this.realIndex;
                    const imageColors = bannerColors[realIndex];
                    
                    if (imageColors) {
                        // 使用当前选择的颜色
                        const selectedColor = imageColors.mainColor;
                        
                        // 使用 CSS 过渡实现平滑的颜色变化
                        document.documentElement.style.setProperty('--main-color', selectedColor);
                        document.documentElement.style.transition = 'all 0.3s ease';
                        
                        // 更新文字颜色
                        const hex = selectedColor.replace('#', '');
                        const r = parseInt(hex.substring(0, 2), 16);
                        const g = parseInt(hex.substring(2, 4), 16);
                        const b = parseInt(hex.substring(4, 6), 16);
                        const textColor = resBgColor([r, g, b]);
                        
                        // 更新所有需要使用文字颜色的元素
                        const topSection = document.querySelector('.top-section');
                        if (topSection) {
                            // 设置整个顶部区域的文字颜色
                            topSection.style.setProperty('--text-color', textColor);
                            topSection.style.color = textColor;

                            // 更新搜索框和图标
                            const searchInput = topSection.querySelector('.search-input');
                            if (searchInput) {
                                searchInput.style.color = textColor;
                                searchInput.style.setProperty('--placeholder-color', textColor);
                            }

                            // 更新所有 SVG 图标
                            const svgIcons = topSection.querySelectorAll('svg');
                            svgIcons.forEach(svg => {
                                svg.style.color = textColor;
                            });

                            // 更新标签
                            const tags = topSection.querySelectorAll('.tag');
                            tags.forEach(tag => {
                                tag.style.color = textColor;
                                if (!tag.classList.contains('active')) {
                                    tag.style.opacity = '0.6';
                                }
                            });

                            // 更新电池图标
                            const batteryIcon = topSection.querySelector('.battery-icon');
                            if (batteryIcon) {
                                batteryIcon.style.borderColor = textColor;
                                const batteryLevel = batteryIcon.querySelector('.battery-level');
                                if (batteryLevel) {
                                    batteryLevel.style.backgroundColor = textColor;
                                }
                            }

                            // 更新状态栏文字
                            const statusBarTexts = topSection.querySelectorAll('.status-bar span');
                            statusBarTexts.forEach(span => {
                                span.style.color = textColor;
                            });
                        }

                        // 动态更新样式
                        const styleId = 'dynamic-theme-styles';
                        let styleEl = document.getElementById(styleId);
                        if (!styleEl) {
                            styleEl = document.createElement('style');
                            styleEl.id = styleId;
                            document.head.appendChild(styleEl);
                        }

                        styleEl.textContent = `
                            .top-section {
                                color: ${textColor};
                            }
                            .status-bar {
                                color: ${textColor};
                            }
                            .search-input {
                                color: ${textColor};
                            }
                            .search-input::placeholder {
                                color: ${textColor};
                                opacity: 0.6;
                            }
                            .tag:not(.active) {
                                color: ${textColor};
                                opacity: 0.6;
                            }
                            .tag.active {
                                color: ${textColor};
                            }
                            .top-section svg {
                                color: ${textColor};
                            }
                            .battery-icon {
                                border-color: ${textColor};
                            }
                            .battery-icon::after {
                                background-color: ${textColor};
                            }
                            .battery-level {
                                background-color: ${textColor};
                            }
                        `;
                    }
                }
            }
        });
    }

    // 初始更新时间并每分钟更新一次
    updateTime();
    setInterval(updateTime, 60000);

    // 处理图片上传
    function handleImageUpload(files) {
        if (!files || files.length === 0) return;

        const swiperWrapper = document.querySelector('.swiper-wrapper');
        const uploadedImagesContainer = document.querySelector('#uploadedImages .space-y-3');
        if (!swiperWrapper || !uploadedImagesContainer) return;

        // 显示已上传图片区域
        document.getElementById('uploadedImages').classList.remove('hidden');
        
        // 处理所有图片
        Array.from(files).forEach((file, index) => {
            if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        // 创建画布并提取颜色
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = this.width;
                        canvas.height = this.height;
                        ctx.drawImage(this, 0, 0);

                        // 提取主色
                        const colors = extractMainColors(canvas, 6);
                        const imageIndex = bannerColors.length;

                        // 存储颜色信息
                        bannerColors.push({
                            mainColor: colors[0],
                            allColors: colors,
                            selectedColorIndex: 0 // 记录当前选择的颜色索引
                        });

                        // 添加到轮播
                        const slide = document.createElement('div');
                        slide.className = 'swiper-slide';
                        const slideImg = new Image();
                        slideImg.style.width = '343px';
                        slideImg.style.height = '146px';
                        slideImg.src = e.target.result;
                        slide.appendChild(slideImg);
                        swiperWrapper.appendChild(slide);

                        // 添加到预览列表
                        const previewItem = document.createElement('div');
                        previewItem.className = 'flex flex-col gap-2 p-3 bg-gray-50 rounded relative group';
                        
                        // 删除按钮
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'absolute right-2 top-2 p-1 rounded-full bg-white/80 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity';
                        deleteBtn.innerHTML = `
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        `;
                        deleteBtn.onclick = (e) => {
                            e.stopPropagation();
                            
                            // 从轮播中移除
                            if (swiper) {
                                // 先销毁 swiper 实例
                                swiper.destroy();
                                // 清空轮播容器
                                const swiperWrapper = document.querySelector('.swiper-wrapper');
                                if (swiperWrapper) {
                                    swiperWrapper.innerHTML = '';
                                }
                            }
                            
                            // 从颜色数组中移除
                            bannerColors.splice(imageIndex, 1);
                            
                            // 从预览列表中移除
                            previewItem.remove();
                            
                            // 更新其他图片的序号
                            const previewItems = uploadedImagesContainer.children;
                            Array.from(previewItems).forEach((item, idx) => {
                                const numberText = item.querySelector('.text-sm.text-gray-900');
                                if (numberText) {
                                    numberText.textContent = `图片 ${idx + 1}`;
                                }
                            });
                            
                            // 如果没有图片了，隐藏预览区域
                            if (bannerColors.length === 0) {
                                document.getElementById('uploadedImages').classList.add('hidden');
                            }
                            
                            // 重新创建轮播图片
                            if (bannerColors.length > 0) {
                                const swiperWrapper = document.querySelector('.swiper-wrapper');
                                bannerColors.forEach((colorInfo, idx) => {
                                    const slide = document.createElement('div');
                                    slide.className = 'swiper-slide';
                                    const img = previewItems[idx].querySelector('img');
                                    if (img) {
                                        const slideImg = document.createElement('img');
                                        slideImg.src = img.src;
                                        slideImg.style.width = '343px';
                                        slideImg.style.height = '146px';
                                        slide.appendChild(slideImg);
                                        swiperWrapper.appendChild(slide);
                                    }
                                });
                                
                                // 重新初始化轮播
                                initSwiper();
                                // 更新主题色为当前显示的图片的颜色
                                const currentColor = bannerColors[0].mainColor;
                                updateThemeColor(currentColor);
                            } else {
                                // 如果没有图片了，重置主题色
                                document.documentElement.style.setProperty('--main-color', '#4338CA');
                                document.documentElement.style.setProperty('--bg-color', '#ffffff');
                                const topSection = document.querySelector('.top-section');
                                if (topSection) {
                                    updateAllColors(topSection, '#ffffff');
                                }
                            }
                        };
                        
                        // 图片和序号
                        const imageInfo = document.createElement('div');
                        imageInfo.className = 'flex items-center gap-2';
                        imageInfo.innerHTML = `
                            <img src="${e.target.result}" class="w-16 h-16 object-cover rounded">
                            <div class="flex-1">
                                <div class="text-sm text-gray-900">图片 ${imageIndex + 1}</div>
                            </div>
                        `;
                        
                        // 颜色选择按钮
                        const colorButtons = document.createElement('div');
                        colorButtons.className = 'grid grid-cols-3 gap-2 mt-2';
                        colors.forEach((color, i) => {
                            const btn = document.createElement('button');
                            // 添加选中状态的样式
                            btn.className = `w-full h-8 rounded border transition-all hover:scale-105 active:scale-95 relative group ${i === 0 ? 'border-2 border-indigo-500' : 'border-gray-200'}`;
                            btn.style.backgroundColor = color;
                            
                            // 添加颜色值显示
                            const colorValue = document.createElement('div');
                            colorValue.className = 'absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 text-white text-xs font-mono rounded transition-opacity';
                            colorValue.textContent = color.toUpperCase();
                            btn.appendChild(colorValue);

                            btn.onclick = () => {
                                // 复制颜色值
                                copyToClipboard(color.toUpperCase());
                                
                                // 更新当前图片的主色和选中状态
                                bannerColors[imageIndex].mainColor = color;
                                bannerColors[imageIndex].selectedColorIndex = i;
                                
                                // 更新按钮样式
                                colorButtons.querySelectorAll('button').forEach((button, index) => {
                                    button.className = `w-full h-8 rounded border transition-all hover:scale-105 active:scale-95 relative group ${index === i ? 'border-2 border-indigo-500' : 'border-gray-200'}`;
                                });
                                
                                // 如果当前轮播显示的是这张图片，立即更新主题色
                                if (swiper && swiper.realIndex === imageIndex) {
                                    // 更新主题色
                                    document.documentElement.style.setProperty('--main-color', color);
                                    
                                    // 计算文字颜色
                                    const hex = color.replace('#', '');
                                    const r = parseInt(hex.substring(0, 2), 16);
                                    const g = parseInt(hex.substring(2, 4), 16);
                                    const b = parseInt(hex.substring(4, 6), 16);
                                    const textColor = resBgColor([r, g, b]);
                                    
                                    // 更新所有需要使用文字颜色的元素
                                    const topSection = document.querySelector('.top-section');
                                    if (topSection) {
                                        updateAllColors(topSection, textColor);
                                    }
                                }
                            };
                            colorButtons.appendChild(btn);
                        });
                        
                        previewItem.appendChild(deleteBtn);
                        previewItem.appendChild(imageInfo);
                        previewItem.appendChild(colorButtons);
                        uploadedImagesContainer.appendChild(previewItem);

                        // 如果是第一张图片，使用第一个颜色作为默认值
                        if (bannerColors.length === 1) {
                            updateThemeColor(colors[0]);
                        }

                        // 初始化或更新轮播
                        if (swiper) {
                            swiper.destroy();
                        }
                        initSwiper();
                    };
                    img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    }

    // 处理文件上传
    document.getElementById('bannerImageInput').addEventListener('change', function(e) {
        handleImageUpload(e.target.files);
    });

    // 处理拖拽上传
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('click', function() {
        document.getElementById('bannerImageInput').click();
    });

    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('border-indigo-500', 'bg-indigo-50/50');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('border-indigo-500', 'bg-indigo-50/50');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('border-indigo-500', 'bg-indigo-50/50');
        handleImageUpload(e.dataTransfer.files);
    });

    // 处理粘贴上传
    document.addEventListener('paste', function(e) {
        const files = Array.from(e.clipboardData.files);
        if (files.length > 0) {
            handleImageUpload(files);
        }
    });

    // 提取图片主色函数
    function extractMainColors(canvas, colorCount = 6) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const colors = {};
        const step = 4; // 每隔几个像素采样一次

        // 收集所有颜色并转换为 HSL
        for (let i = 0; i < imageData.length; i += 4 * step) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const [h, s, l] = rgbToHsl(r, g, b);
            
            // 忽略过暗或过亮的颜色
            if (l < 0.1 || l > 0.9) continue;
            // 忽略饱和度过低的颜色
            if (s < 0.1) continue;

            const rgb = `${r},${g},${b}`;
            colors[rgb] = (colors[rgb] || 0) + 1;
        }

        // 转换为数组并排序
        const sortedColors = Object.entries(colors)
            .map(([rgb, count]) => {
                const [r, g, b] = rgb.split(',').map(Number);
                const [h, s, l] = rgbToHsl(r, g, b);
                return {
                    rgb: [r, g, b],
                    hsl: [h, s, l],
                    count: count
                };
            })
            .sort((a, b) => b.count - a.count);

        // 获取主色，确保颜色之间有足够的差异和视觉平衡
        const mainColors = [];
        for (const color of sortedColors) {
            if (mainColors.length >= colorCount) break;
            
            // 检查与已选颜色的差异
            const isDifferentEnough = mainColors.every(existingColor => {
                // 计算 HSL 空间中的差异
                const hueDiff = Math.abs(color.hsl[0] - existingColor.hsl[0]);
                const satDiff = Math.abs(color.hsl[1] - existingColor.hsl[1]);
                const lightDiff = Math.abs(color.hsl[2] - existingColor.hsl[2]);
                
                // 色相差异要足够大（至少 30 度）
                if (hueDiff < 30 && hueDiff > 330) return false;
                // 饱和度和亮度差异也要考虑
                if (satDiff + lightDiff < 0.2) return false;
                
                return true;
            });

            if (isDifferentEnough) {
                mainColors.push(color);
            }
        }

        // 按色相排序
        mainColors.sort((a, b) => a.hsl[0] - b.hsl[0]);

        // 转换为十六进制颜色
        return mainColors.map(color => 
            '#' + color.rgb.map(x => x.toString(16).padStart(2, '0')).join('')
        );
    }

    // RGB 转 HSL
    function rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }

            h /= 6;
        }

        return [h * 360, s, l];
    }

    // 复制颜色值到剪贴板
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // 可以添加一个小提示
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg text-sm';
            toast.textContent = `已复制颜色值：${text}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        });
    }

    // 更新所有颜色的辅助函数
    function updateAllColors(topSection, textColor) {
        // 设置整个顶部区域的文字颜色
        topSection.style.setProperty('--text-color', textColor);
        topSection.style.color = textColor;

        // 更新搜索框和图标
        const searchInput = topSection.querySelector('.search-input');
        if (searchInput) {
            searchInput.style.color = textColor;
            searchInput.style.setProperty('--placeholder-color', textColor);
        }

        // 更新所有 SVG 图标
        const svgIcons = topSection.querySelectorAll('svg');
        svgIcons.forEach(svg => {
            svg.style.color = textColor;
        });

        // 更新标签
        const tags = topSection.querySelectorAll('.tag');
        tags.forEach(tag => {
            tag.style.color = textColor;
            if (!tag.classList.contains('active')) {
                tag.style.opacity = '0.6';
            }
        });

        // 更新电池图标
        const batteryIcon = topSection.querySelector('.battery-icon');
        if (batteryIcon) {
            batteryIcon.style.borderColor = textColor;
            const batteryLevel = batteryIcon.querySelector('.battery-level');
            if (batteryLevel) {
                batteryLevel.style.backgroundColor = textColor;
            }
        }

        // 更新状态栏文字
        const statusBarTexts = topSection.querySelectorAll('.status-bar span');
        statusBarTexts.forEach(span => {
            span.style.color = textColor;
        });

        // 动态更新样式
        const styleId = 'dynamic-theme-styles';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
            .top-section {
                color: ${textColor};
            }
            .status-bar {
                color: ${textColor};
            }
            .search-input {
                color: ${textColor};
            }
            .search-input::placeholder {
                color: ${textColor};
                opacity: 0.6;
            }
            .tag:not(.active) {
                color: ${textColor};
                opacity: 0.6;
            }
            .tag.active {
                color: ${textColor};
            }
            .top-section svg {
                color: ${textColor};
            }
            .battery-icon {
                border-color: ${textColor};
            }
            .battery-icon::after {
                background-color: ${textColor};
            }
            .battery-level {
                background-color: ${textColor};
            }
        `;
    }
});
