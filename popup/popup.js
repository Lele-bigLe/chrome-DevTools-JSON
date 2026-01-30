/**
 * JSON 数据结构提取器 - 增强版
 * 支持大数据、深层嵌套、多种输出格式
 */

// DOM 元素
const elements = {
  jsonInput: document.getElementById('jsonInput'),
  output: document.getElementById('output'),
  extractBtn: document.getElementById('extractBtn'),
  copyBtn: document.getElementById('copyBtn'),
  pasteBtn: document.getElementById('pasteBtn'),
  clearBtn: document.getElementById('clearBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  optionsPanel: document.getElementById('optionsPanel'),
  showArrayLength: document.getElementById('showArrayLength'),
  showSampleValue: document.getElementById('showSampleValue'),
  keysOnly: document.getElementById('keysOnly'),
  compactMode: document.getElementById('compactMode'),
  maxDepth: document.getElementById('maxDepth'),
  toast: document.getElementById('toast'),
  status: document.getElementById('status'),
  inputStats: document.getElementById('inputStats'),
  outputStats: document.getElementById('outputStats')
}

// 存储原始结构数据
let structureResult = null
let processStartTime = 0

/**
 * 获取当前配置选项
 */
function getOptions() {
  return {
    showLength: elements.showArrayLength.checked,
    showSample: elements.showSampleValue.checked,
    keysOnly: elements.keysOnly.checked,
    compact: elements.compactMode.checked,
    maxDepth: parseInt(elements.maxDepth.value) || 0
  }
}

/**
 * 提取数据结构（增强版）
 * @param {any} data - 输入数据
 * @param {object} options - 配置选项
 * @param {number} depth - 当前深度
 * @param {WeakSet} seen - 已访问对象（循环引用检测）
 * @returns {any} 数据结构描述
 */
function extractStructure(data, options = {}, depth = 0, seen = new WeakSet()) {
  const { showLength = true, showSample = false, keysOnly = false, maxDepth = 0 } = options

  // 深度限制检查
  if (maxDepth > 0 && depth >= maxDepth) {
    return '...'
  }

  // null 类型
  if (data === null) {
    return keysOnly ? null : (showSample ? 'null' : 'null')
  }

  // undefined 类型
  if (data === undefined) {
    return keysOnly ? null : 'undefined'
  }

  const type = typeof data

  // 基础类型处理
  if (type === 'string') {
    if (keysOnly) return null
    if (showSample) {
      const sample = data.length > 30 ? data.slice(0, 30) + '...' : data
      return `string ("${sample}")`
    }
    return 'string'
  }

  if (type === 'number') {
    if (keysOnly) return null
    return showSample ? `number (${data})` : 'number'
  }

  if (type === 'boolean') {
    if (keysOnly) return null
    return showSample ? `boolean (${data})` : 'boolean'
  }

  // 循环引用检测
  if (type === 'object') {
    if (seen.has(data)) {
      return '[Circular Reference]'
    }
    seen.add(data)
  }

  // 数组类型处理
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return keysOnly ? '[]' : (showLength ? 'array[0]' : 'array[]')
    }

    const lengthInfo = showLength ? `[${data.length}]` : ''
    const firstItem = extractStructure(data[0], options, depth + 1, seen)

    // 如果数组元素是基础类型
    if (typeof data[0] !== 'object' || data[0] === null) {
      if (keysOnly) return `array${lengthInfo}`
      return `array${lengthInfo}<${firstItem}>`
    }

    // 数组元素是对象
    return {
      __type__: `array${lengthInfo}`,
      __items__: firstItem
    }
  }

  // 对象类型处理
  if (type === 'object') {
    const keys = Object.keys(data)
    if (keys.length === 0) {
      return {}
    }

    const result = {}
    for (const key of keys) {
      result[key] = extractStructure(data[key], options, depth + 1, seen)
    }
    return result
  }

  return keysOnly ? null : type
}

/**
 * 格式化输出（带语法高亮）
 * @param {any} structure - 数据结构
 * @param {number} indent - 缩进级别
 * @param {boolean} compact - 紧凑模式
 * @returns {string} 格式化的 HTML 字符串
 */
function formatOutput(structure, indent = 0, compact = false) {
  const spaces = compact ? '' : '  '.repeat(indent)
  const newline = compact ? '' : '\n'

  // 字符串类型标记
  if (typeof structure === 'string') {
    let typeClass = 'type-string'
    if (structure.startsWith('number')) typeClass = 'type-number'
    else if (structure.startsWith('boolean')) typeClass = 'type-boolean'
    else if (structure === 'null' || structure.startsWith('null')) typeClass = 'type-null'
    else if (structure.startsWith('array') || structure === '...') typeClass = 'type-array'
    else if (structure === '[Circular Reference]') typeClass = 'type-null'

    return `<span class="${typeClass}">${escapeHtml(structure)}</span>`
  }

  // null/undefined
  if (structure === null || structure === undefined) {
    return `<span class="type-null">null</span>`
  }

  // 对象/数组结构处理
  if (typeof structure === 'object') {
    // 带类型标记的数组
    if (structure.__type__ && structure.__items__ !== undefined) {
      const typeLabel = `<span class="type-array">${escapeHtml(structure.__type__)}</span>`
      const items = formatOutput(structure.__items__, indent, compact)
      return `${typeLabel} ${items}`
    }

    // 普通对象
    const keys = Object.keys(structure)
    if (keys.length === 0) {
      return '<span class="bracket">{}</span>'
    }

    let result = `<span class="bracket">{</span>${newline}`
    keys.forEach((key, index) => {
      const value = formatOutput(structure[key], indent + 1, compact)
      const comma = index < keys.length - 1 ? ',' : ''
      const lineSpaces = compact ? '' : '  '.repeat(indent + 1)
      result += `${lineSpaces}<span class="key">"${escapeHtml(key)}"</span>: ${value}${comma}${newline}`
    })
    result += `${spaces}<span class="bracket">}</span>`

    return result
  }

  return escapeHtml(String(structure))
}

/**
 * HTML 转义
 */
function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * 将结构转为纯文本
 * @param {any} structure - 数据结构
 * @param {number} indent - 缩进级别
 * @param {boolean} compact - 紧凑模式
 * @returns {string} 纯文本字符串
 */
function structureToText(structure, indent = 0, compact = false) {
  const spaces = compact ? '' : '  '.repeat(indent)
  const newline = compact ? '' : '\n'

  if (typeof structure === 'string') {
    return structure
  }

  if (structure === null || structure === undefined) {
    return 'null'
  }

  if (typeof structure === 'object') {
    // 带类型标记的数组
    if (structure.__type__ && structure.__items__ !== undefined) {
      const items = structureToText(structure.__items__, indent, compact)
      return `${structure.__type__} ${items}`
    }

    // 普通对象
    const keys = Object.keys(structure)
    if (keys.length === 0) {
      return '{}'
    }

    let result = `{${newline}`
    keys.forEach((key, index) => {
      const value = structureToText(structure[key], indent + 1, compact)
      const comma = index < keys.length - 1 ? ',' : ''
      const lineSpaces = compact ? '' : '  '.repeat(indent + 1)
      result += `${lineSpaces}"${key}": ${value}${comma}${newline}`
    })
    result += `${spaces}}`

    return result
  }

  return String(structure)
}

/**
 * 显示 Toast 提示
 */
function showToast(message, type = 'success') {
  elements.toast.textContent = message
  elements.toast.className = `toast ${type} show`

  setTimeout(() => {
    elements.toast.className = 'toast'
  }, 2000)
}

/**
 * 更新状态
 */
function updateStatus(text) {
  elements.status.textContent = text
}

/**
 * 统计 JSON 信息
 */
function getJsonStats(data) {
  let count = { keys: 0, depth: 0 }

  function traverse(obj, depth = 0) {
    if (depth > count.depth) count.depth = depth

    if (Array.isArray(obj)) {
      obj.forEach(item => traverse(item, depth + 1))
    } else if (obj && typeof obj === 'object') {
      const keys = Object.keys(obj)
      count.keys += keys.length
      keys.forEach(key => traverse(obj[key], depth + 1))
    }
  }

  traverse(data)
  return count
}

/**
 * 提取按钮点击事件
 */
elements.extractBtn.addEventListener('click', () => {
  const inputText = elements.jsonInput.value.trim()

  if (!inputText) {
    showToast('请先粘贴 JSON 数据', 'error')
    return
  }

  processStartTime = performance.now()
  updateStatus('处理中...')

  try {
    const jsonData = JSON.parse(inputText)
    const options = getOptions()

    // 获取统计信息
    const stats = getJsonStats(jsonData)
    elements.inputStats.textContent = `${stats.keys} 个键 · ${stats.depth} 层深度`

    // 提取结构
    structureResult = extractStructure(jsonData, options)

    // 格式化输出
    elements.output.innerHTML = formatOutput(structureResult, 0, options.compact)

    // 计算处理时间
    const processTime = (performance.now() - processStartTime).toFixed(1)
    updateStatus(`完成 (${processTime}ms)`)

    // 输出统计
    const outputStats = getJsonStats(structureResult)
    elements.outputStats.textContent = `${outputStats.keys} 个字段`

    showToast('提取成功！')
  } catch (e) {
    elements.output.innerHTML = `<span style="color: #ef4444;">JSON 解析错误：${escapeHtml(e.message)}</span>`
    showToast('JSON 格式错误', 'error')
    updateStatus('错误')
    structureResult = null
  }
})

/**
 * 复制按钮点击事件
 */
elements.copyBtn.addEventListener('click', async () => {
  if (!structureResult) {
    showToast('请先提取数据结构', 'error')
    return
  }

  try {
    const options = getOptions()
    const text = structureToText(structureResult, 0, options.compact)
    await navigator.clipboard.writeText(text)
    showToast('已复制到剪贴板！')
  } catch (e) {
    showToast('复制失败', 'error')
  }
})

/**
 * 粘贴按钮点击事件
 */
elements.pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText()
    elements.jsonInput.value = text

    // 更新输入统计
    try {
      const data = JSON.parse(text)
      const stats = getJsonStats(data)
      elements.inputStats.textContent = `${stats.keys} 个键 · ${stats.depth} 层深度`
    } catch {
      elements.inputStats.textContent = ''
    }

    showToast('已粘贴')
  } catch (e) {
    showToast('无法访问剪贴板', 'error')
  }
})

/**
 * 清空按钮点击事件
 */
elements.clearBtn.addEventListener('click', () => {
  elements.jsonInput.value = ''
  elements.output.innerHTML = ''
  elements.inputStats.textContent = ''
  elements.outputStats.textContent = ''
  structureResult = null
  updateStatus('就绪')
})

/**
 * 设置按钮点击事件
 */
elements.settingsBtn.addEventListener('click', () => {
  elements.optionsPanel.classList.toggle('show')
})

/**
 * 输入框内容变化
 */
elements.jsonInput.addEventListener('input', () => {
  const text = elements.jsonInput.value.trim()
  if (!text) {
    elements.inputStats.textContent = ''
    return
  }

  try {
    const data = JSON.parse(text)
    const stats = getJsonStats(data)
    elements.inputStats.textContent = `${stats.keys} 个键 · ${stats.depth} 层深度`
  } catch {
    elements.inputStats.textContent = '无效 JSON'
  }
})

/**
 * 快捷键支持
 */
document.addEventListener('keydown', (e) => {
  // Ctrl+Enter 提取
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    elements.extractBtn.click()
  }
  // Ctrl+Shift+C 复制结构
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault()
    elements.copyBtn.click()
  }
  // Ctrl+V 粘贴时自动聚焦输入框
  if (e.ctrlKey && e.key === 'v' && document.activeElement !== elements.jsonInput) {
    elements.jsonInput.focus()
  }
})

// 初始化：默认显示选项面板
elements.optionsPanel.classList.add('show')
