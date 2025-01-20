# 火把工具箱

一个简单易用的在线工具集合，提供多种图片处理功能。

## 功能特点

### 1. 图片切割工具
- 支持自定义切割尺寸
- 支持预览切割效果
- 支持批量下载切割后的图片

### 2. 图片压缩工具
- 支持多种压缩质量选择
- 支持多种输出格式（JPG、PNG、WebP）
- 支持批量处理多张图片
- 实时显示压缩效果和大小对比

### 3. 图片取色工具
- 支持提取图片主色调
- 自动生成颜色的明暗变体
- 支持一键复制颜色代码
- 支持批量处理多张图片
- 支持拖拽上传

## 使用方法

1. 直接访问工具网站
2. 选择需要使用的工具
3. 上传图片（支持拖拽或点击上传）
4. 根据需要调整参数
5. 获取处理结果

## 技术栈

- HTML5
- Tailwind CSS
- JavaScript
- Color Thief (颜色提取)
- Browser Image Compression (图片压缩)

## 本地开发

1. 克隆项目
```bash
git clone [repository-url]
```

2. 安装依赖（如果需要）
```bash
# 如果有需要安装的依赖，在这里列出
```

3. 运行项目
```bash
# 可以使用任何静态文件服务器
# 例如：Python 的 http.server
python -m http.server
# 或者使用 Node.js 的 http-server
npx http-server
```

## 浏览器兼容性

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 注意事项

- 图片处理在浏览器端进行，不会上传到服务器
- 建议使用现代浏览器以获得最佳体验
- 部分功能可能需要较新版本的浏览器才能支持

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT License 

# 主色提取规范

## 颜色提取算法

我们使用基于 HSL 颜色空间的智能提取算法来获取图片的主色。这种方法能够提供更加和谐、美观的颜色组合。

### 提取规则

1. **颜色采样**
   - 对图片进行像素采样（每隔 4 个像素采样一次）
   - 统计每种颜色出现的频率

2. **颜色过滤**
   - 忽略过暗的颜色（亮度 < 0.1）
   - 忽略过亮的颜色（亮度 > 0.9）
   - 忽略饱和度过低的颜色（饱和度 < 0.1）

3. **颜色差异保证**
   - 色相差异至少 30 度
   - 饱和度和亮度的总差异至少 0.2
   - 按色相排序，确保颜色过渡自然

### 颜色选择

从每张图片中提取 6 个主色：
1. 按颜色出现频率排序
2. 确保颜色之间有足够的视觉差异
3. 自动选择最具代表性的颜色作为默认主色
4. 其他颜色作为备选方案

### 应用场景

1. **Banner 轮播**
   - 每张图片自动应用其主色
   - 轮播切换时平滑过渡
   - 根据主色自动调整文字颜色（黑/白）

2. **交互设计**
   - 点击颜色可复制色值
   - 颜色切换时有过渡动画
   - 当前选中的颜色有高亮边框

### 颜色计算

```javascript
// RGB 转 HSL 的计算公式
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

    return [h * 360, s, l]; // 返回 [色相, 饱和度, 亮度]
}
```

### 文字颜色自适应

根据背景色的亮度自动选择文字颜色：
```javascript
function getTextColor(r, g, b) {
    // 按照人眼对不同颜色的敏感度加权
    const brightness = 0.213 * r + 0.715 * g + 0.072 * b;
    return brightness > 255/2 ? '#000000' : '#ffffff';
}
``` 