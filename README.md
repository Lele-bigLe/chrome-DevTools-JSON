# JSON Structure Extractor - Chrome 插件

一个简洁的 Chrome 浏览器插件，用于从 JSON 数据中提取数据结构。

## 功能特性

- 📋 **一键粘贴** - 快速粘贴剪贴板中的 JSON 数据
- 🔍 **结构提取** - 将 JSON 数据转换为类型结构描述
- 📄 **一键复制** - 复制提取的数据结构
- ⚙️ **可选配置**
  - 显示数组长度
  - 保留示例值

## 安装方法

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择此项目文件夹

## 使用方法

1. 点击浏览器工具栏中的插件图标
2. 在 DevTools Network 面板中复制接口响应数据
3. 点击 **粘贴** 按钮或手动粘贴 JSON
4. 点击 **提取数据结构** 按钮
5. 点击 **复制结构** 获取结果

## 快捷键

- `Ctrl + Enter` - 提取数据结构
- `Ctrl + Shift + C` - 复制结构

## 示例

输入：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "users": [
      {
        "id": 1,
        "name": "张三",
        "age": 25,
        "active": true
      }
    ],
    "total": 100
  }
}
```

输出：
```
{
  "code": number,
  "message": string,
  "data": {
    "users": array[1] {
      "id": number,
      "name": string,
      "age": number,
      "active": boolean
    },
    "total": number
  }
}
```

## 图标

请将以下尺寸的图标放入 `icons` 文件夹：
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

可以使用在线工具生成，或使用项目提供的 SVG 文件转换。

## 技术栈

- Chrome Extension Manifest V3
- 原生 JavaScript
- CSS3

## License

MIT
