# JSON Structure Extractor - Chrome 插件

一个简洁的 Chrome 浏览器插件，用于从 JSON 数据中提取数据结构。

## 功能特性

- 📋 **结构提取** - 将 JSON 转换为类型结构描述，支持示例值、仅键名、紧凑模式、最大深度
- 🔷 **TypeScript 类型生成** - 一键生成 interface / type 定义
- 🔍 **结构对比** - 对比两个 JSON 的结构差异，标注新增/移除字段路径
- 🔗 **URL 参数解析** - 支持标准 URL 和 Hash 路由，表格展示解码值与原始值
- 📖 **历史记录** - 自动保存最近 15 条，回放时直接展示已保存结果
- 🎨 **明暗主题** - 一键切换，持久化保存
- ⚙️ **可选配置** - 显示数组长度、示例值、紧凑模式、最大深度、输出格式

## 安装方法

1. 打开 Chrome 浏览器，访问 chrome://extensions/
2. 开启右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择此项目文件夹

## 使用方法

1. 点击浏览器工具栏中的插件图标
2. 在 DevTools Network 面板中复制接口响应数据
3. 点击 **粘贴** 按钮或手动粘贴 JSON
4. 点击 **提取** 按钮
5. 点击 **复制** 获取结果

## 快捷键

- Ctrl + Enter - 提取数据结构
- Ctrl + Shift + C - 复制结果

## 技术栈

- Chrome Extension Manifest V3
- 原生 JavaScript（无框架、无构建工具）
- CSS Variables 双主题

## License

MIT
