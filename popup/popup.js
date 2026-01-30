/**
 * JSON 数据结构提取器 - 完整增强版
 * 功能：结构提取、TypeScript类型、对比、URL获取、历史记录、主题切换
 */

// ==================== DOM 元素 ====================
const $ = id => document.getElementById(id)
const elements = {
  // 基础元素
  jsonInput: $('jsonInput'),
  output: $('output'),
  toast: $('toast'),
  status: $('status'),
  inputStats: $('inputStats'),
  outputStats: $('outputStats'),

  // 按钮
  extractBtn: $('extractBtn'),
  copyBtn: $('copyBtn'),
  pasteBtn: $('pasteBtn'),
  clearBtn: $('clearBtn'),
  formatBtn: $('formatBtn'),
  settingsBtn: $('settingsBtn'),
  themeBtn: $('themeBtn'),
  historyBtn: $('historyBtn'),
  compareBtn: $('compareBtn'),
  clearHistoryBtn: $('clearHistoryBtn'),

  // 面板
  optionsPanel: $('optionsPanel'),
  historyPanel: $('historyPanel'),
  historyList: $('historyList'),

  // 选项
  showArrayLength: $('showArrayLength'),
  showSampleValue: $('showSampleValue'),
  keysOnly: $('keysOnly'),
  compactMode: $('compactMode'),
  maxDepth: $('maxDepth'),
  outputFormat: $('outputFormat'),

  // 对比模式
  compareInputA: $('compareInputA'),
  compareInputB: $('compareInputB'),
  compareOutput: $('compareOutput'),

  // 选项卡和面板
  app: document.querySelector('.app')
}

// ==================== 状态管理 ====================
let structureResult = null
let currentTab = 'extract'
let historyCache = null
const HISTORY_KEY = 'history'
const THEME_KEY = 'theme'
const OPTIONS_KEY = 'options'
const MAX_HISTORY = 15 // 减少历史记录数量以提升性能

// ==================== 存储工具函数 ====================

/**
 * 保存数据到 Chrome Storage
 */
function saveStorage(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve)
  })
}

/**
 * 从 Chrome Storage 读取数据
 */
function loadStorage(key, defaultValue = null) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] !== undefined ? result[key] : defaultValue)
    })
  })
}

/**
 * 迁移 localStorage 数据到 chrome.storage.local
 */
async function migrateFromLocalStorage() {
  const migrationKey = 'migrated_v1'
  const migrated = await loadStorage(migrationKey, false)
  
  if (migrated) return
  
  // 迁移历史记录
  const oldHistory = localStorage.getItem(HISTORY_KEY)
  if (oldHistory) {
    try {
      const history = JSON.parse(oldHistory)
      await saveStorage(HISTORY_KEY, history)
      localStorage.removeItem(HISTORY_KEY)
    } catch (e) {
      // 忽略解析错误
    }
  }
  
  // 迁移主题
  const oldTheme = localStorage.getItem(THEME_KEY)
  if (oldTheme) {
    await saveStorage(THEME_KEY, oldTheme)
    localStorage.removeItem(THEME_KEY)
  }
  
  // 迁移选项
  const oldOptions = localStorage.getItem(OPTIONS_KEY)
  if (oldOptions) {
    try {
      const options = JSON.parse(oldOptions)
      await saveStorage(OPTIONS_KEY, options)
      localStorage.removeItem(OPTIONS_KEY)
    } catch (e) {
      // 忽略解析错误
    }
  }
  
  // 标记已迁移
  await saveStorage(migrationKey, true)
}

// ==================== 工具函数 ====================

/**
 * HTML 转义
 */
function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * 显示 Toast 提示
 */
function showToast(message, type = 'success') {
  elements.toast.textContent = message
  elements.toast.className = `toast ${type} show`
  setTimeout(() => { elements.toast.className = 'toast' }, 2000)
}

/**
 * 更新状态栏
 */
function updateStatus(text) {
  elements.status.textContent = text
}

/**
 * 获取当前配置选项
 */
function getOptions() {
  return {
    showLength: elements.showArrayLength.checked,
    showSample: elements.showSampleValue.checked,
    keysOnly: elements.keysOnly.checked,
    compact: elements.compactMode.checked,
    maxDepth: parseInt(elements.maxDepth.value) || 0,
    format: elements.outputFormat.value
  }
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

// ==================== 核心功能：结构提取 ====================

/**
 * 提取数据结构
 */
function extractStructure(data, options = {}, depth = 0, seen = new WeakSet()) {
  const { showLength = true, showSample = false, keysOnly = false, maxDepth = 0 } = options

  // 深度限制
  if (maxDepth > 0 && depth >= maxDepth) return '...'
  
  // null
  if (data === null) return keysOnly ? null : 'null'
  
  // undefined
  if (data === undefined) return keysOnly ? null : 'undefined'

  const type = typeof data

  // 基础类型
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
    if (seen.has(data)) return '[Circular]'
    seen.add(data)
  }

  // 数组
  if (Array.isArray(data)) {
    if (data.length === 0) return keysOnly ? '[]' : (showLength ? 'array[0]' : 'array[]')

    const lengthInfo = showLength ? `[${data.length}]` : ''
    const firstItem = extractStructure(data[0], options, depth + 1, seen)

    if (typeof data[0] !== 'object' || data[0] === null) {
      return keysOnly ? `array${lengthInfo}` : `array${lengthInfo}<${firstItem}>`
    }

    return { __type__: `array${lengthInfo}`, __items__: firstItem }
  }

  // 对象
  if (type === 'object') {
    const keys = Object.keys(data)
    if (keys.length === 0) return {}

    const result = {}
    for (const key of keys) {
      result[key] = extractStructure(data[key], options, depth + 1, seen)
    }
    return result
  }

  return keysOnly ? null : type
}

// ==================== 核心功能：TypeScript 类型生成 ====================

/**
 * 生成 TypeScript 类型定义
 */
function generateTypeScript(data, name = 'Root', indent = 0) {
  const spaces = '  '.repeat(indent)
  const type = typeof data

  // null/undefined
  if (data === null) return 'null'
  if (data === undefined) return 'undefined'

  // 基础类型
  if (type === 'string') return 'string'
  if (type === 'number') return 'number'
  if (type === 'boolean') return 'boolean'

  // 数组
  if (Array.isArray(data)) {
    if (data.length === 0) return 'any[]'
    const itemType = generateTypeScript(data[0], name + 'Item', indent)
    
    // 如果数组元素是复杂对象，生成内联接口
    if (typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
      return `Array<{\n${generateObjectFields(data[0], indent + 1)}\n${spaces}}>`
    }
    return `${itemType}[]`
  }

  // 对象
  if (type === 'object') {
    return `{\n${generateObjectFields(data, indent + 1)}\n${spaces}}`
  }

  return 'any'
}

/**
 * 生成对象字段
 */
function generateObjectFields(obj, indent = 0) {
  const spaces = '  '.repeat(indent)
  const lines = []

  for (const key of Object.keys(obj)) {
    const value = obj[key]
    const fieldType = generateTypeScript(value, capitalize(key), indent)
    // 判断是否需要引号
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`
    lines.push(`${spaces}${safeKey}: ${fieldType};`)
  }

  return lines.join('\n')
}

/**
 * 首字母大写
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * 格式化 TypeScript 输出（带语法高亮）
 */
function formatTypeScript(data, interfaceName = 'IResponse') {
  const content = generateTypeScript(data, interfaceName, 0)
  
  // 如果是简单类型，直接返回
  if (!content.startsWith('{') && !content.startsWith('Array')) {
    return `<span class="ts-keyword">type</span> <span class="ts-interface">${interfaceName}</span> = <span class="ts-type">${content}</span>;`
  }

  // 生成接口定义
  let result = `<span class="ts-keyword">interface</span> <span class="ts-interface">${interfaceName}</span> `
  result += highlightTypeScript(content)
  
  return result
}

/**
 * TypeScript 语法高亮
 */
function highlightTypeScript(code) {
  return code
    .replace(/\b(string|number|boolean|null|undefined|any)\b/g, '<span class="ts-type">$1</span>')
    .replace(/\bArray</g, '<span class="ts-type">Array</span><')
}

// ==================== 核心功能：结构对比 ====================

/**
 * 对比两个 JSON 的结构差异
 */
function compareStructures(a, b, path = '') {
  const result = { same: [], added: [], removed: [] }

  const typeA = getType(a)
  const typeB = getType(b)

  // 类型不同
  if (typeA !== typeB) {
    result.removed.push({ path: path || 'root', type: typeA })
    result.added.push({ path: path || 'root', type: typeB })
    return result
  }

  // 都是对象
  if (typeA === 'object') {
    const keysA = Object.keys(a || {})
    const keysB = Object.keys(b || {})
    const allKeys = [...new Set([...keysA, ...keysB])]

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key
      
      if (!(key in a)) {
        result.added.push({ path: newPath, type: getType(b[key]) })
      } else if (!(key in b)) {
        result.removed.push({ path: newPath, type: getType(a[key]) })
      } else {
        const sub = compareStructures(a[key], b[key], newPath)
        result.same.push(...sub.same)
        result.added.push(...sub.added)
        result.removed.push(...sub.removed)
      }
    }

    if (result.added.length === 0 && result.removed.length === 0 && keysA.length > 0) {
      result.same.push({ path: path || 'root', type: 'object' })
    }
  }
  // 都是数组
  else if (typeA === 'array') {
    if (a.length > 0 && b.length > 0) {
      const sub = compareStructures(a[0], b[0], path + '[0]')
      result.same.push(...sub.same)
      result.added.push(...sub.added)
      result.removed.push(...sub.removed)
    }
    if (result.added.length === 0 && result.removed.length === 0) {
      result.same.push({ path: path || 'root', type: 'array' })
    }
  }
  // 基础类型相同
  else {
    result.same.push({ path: path || 'root', type: typeA })
  }

  return result
}

/**
 * 获取值的类型
 */
function getType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/**
 * 格式化对比结果
 */
function formatCompareResult(result) {
  let output = ''

  if (result.added.length > 0) {
    output += '<span class="diff-add">+ 新增字段：</span>\n'
    result.added.forEach(item => {
      output += `<span class="diff-add">  + ${item.path}: ${item.type}</span>\n`
    })
    output += '\n'
  }

  if (result.removed.length > 0) {
    output += '<span class="diff-remove">- 移除字段：</span>\n'
    result.removed.forEach(item => {
      output += `<span class="diff-remove">  - ${item.path}: ${item.type}</span>\n`
    })
    output += '\n'
  }

  if (result.added.length === 0 && result.removed.length === 0) {
    output = '<span class="diff-same">✓ 两个 JSON 的结构完全相同</span>'
  } else {
    output += `<span class="diff-same">相同字段: ${result.same.length} 个</span>`
  }

  return output
}

// ==================== 格式化输出 ====================

/**
 * 格式化结构输出（带语法高亮）
 */
function formatOutput(structure, indent = 0, compact = false) {
  const spaces = compact ? '' : '  '.repeat(indent)
  const newline = compact ? '' : '\n'

  if (typeof structure === 'string') {
    let typeClass = 'type-string'
    if (structure.startsWith('number')) typeClass = 'type-number'
    else if (structure.startsWith('boolean')) typeClass = 'type-boolean'
    else if (structure === 'null' || structure.startsWith('null')) typeClass = 'type-null'
    else if (structure.startsWith('array') || structure === '...') typeClass = 'type-array'
    else if (structure === '[Circular]') typeClass = 'type-null'
    return `<span class="${typeClass}">${escapeHtml(structure)}</span>`
  }

  if (structure === null || structure === undefined) {
    return `<span class="type-null">null</span>`
  }

  if (typeof structure === 'object') {
    if (structure.__type__ && structure.__items__ !== undefined) {
      const typeLabel = `<span class="type-array">${escapeHtml(structure.__type__)}</span>`
      const items = formatOutput(structure.__items__, indent, compact)
      return `${typeLabel} ${items}`
    }

    const keys = Object.keys(structure)
    if (keys.length === 0) return '<span class="bracket">{}</span>'

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
 * 将结构转为纯文本
 */
function structureToText(structure, indent = 0, compact = false) {
  const spaces = compact ? '' : '  '.repeat(indent)
  const newline = compact ? '' : '\n'

  if (typeof structure === 'string') return structure
  if (structure === null || structure === undefined) return 'null'

  if (typeof structure === 'object') {
    if (structure.__type__ && structure.__items__ !== undefined) {
      return `${structure.__type__} ${structureToText(structure.__items__, indent, compact)}`
    }

    const keys = Object.keys(structure)
    if (keys.length === 0) return '{}'

    let result = `{${newline}`
    keys.forEach((key, index) => {
      const value = structureToText(structure[key], indent + 1, compact)
      const comma = index < keys.length - 1 ? ',' : ''
      result += `${compact ? '' : '  '.repeat(indent + 1)}"${key}": ${value}${comma}${newline}`
    })
    result += `${spaces}}`
    return result
  }

  return String(structure)
}

/**
 * TypeScript 转纯文本
 */
function typeScriptToText(data, interfaceName = 'IResponse') {
  const content = generateTypeScript(data, interfaceName, 0)
  
  if (!content.startsWith('{') && !content.startsWith('Array')) {
    return `type ${interfaceName} = ${content};`
  }

  return `interface ${interfaceName} ${content}`
}

// ==================== 历史记录 ====================

/**
 * 保存到历史记录
 */
async function saveToHistory(input) {
  const history = historyCache || await loadStorage(HISTORY_KEY, [])
  
  // 限制单条记录大小
  const maxInputLength = 5000
  const item = {
    id: Date.now(),
    input: input.length > maxInputLength ? input.slice(0, maxInputLength) : input,
    preview: input.slice(0, 60).replace(/\s+/g, ' '),
    time: new Date().toLocaleString(),
    truncated: input.length > maxInputLength
  }
  
  history.unshift(item)
  if (history.length > MAX_HISTORY) history.pop()
  
  historyCache = history
  await saveStorage(HISTORY_KEY, history)
  renderHistory()
}

/**
 * 渲染历史记录
 */
function renderHistory() {
  const history = historyCache || []
  
  // 更新历史记录总数
  const headerSpan = document.querySelector('.history-header span')
  if (headerSpan) {
    headerSpan.textContent = `历史记录 (${history.length})`
  }
  
  if (history.length === 0) {
    elements.historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>'
    return
  }

  elements.historyList.innerHTML = history.map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-item-title">${escapeHtml((item.preview || item.input.slice(0, 50)))}...</div>
      <div class="history-item-time">${item.time}</div>
    </div>
  `).join('')
}

/**
 * 初始化历史记录缓存
 */
async function initHistory() {
  historyCache = await loadStorage(HISTORY_KEY, [])
  renderHistory()
}

/**
 * 加载历史记录项
 */
function loadHistoryItem(id) {
  // 使用内存缓存，避免异步读取
  const history = historyCache || []
  const item = history.find(h => h.id === parseInt(id))
  
  if (item) {
    // 切换到结构提取页签
    switchTab('extract')
    // 填充数据
    elements.jsonInput.value = item.input
    elements.historyPanel.classList.remove('show')
    
    // 如果数据被截断，提示用户
    if (item.truncated) {
      showToast('数据较大，已截断加载', 'warning')
    }
    
    // 自动提取
    setTimeout(() => elements.extractBtn.click(), 50)
  }
}

// ==================== 主题切换 ====================

/**
 * 切换主题
 */
async function toggleTheme() {
  const current = elements.app.dataset.theme
  const next = current === 'dark' ? 'light' : 'dark'
  elements.app.dataset.theme = next
  await saveStorage(THEME_KEY, next)
}

/**
 * 初始化主题 - 默认浅色主题
 */
async function initTheme() {
  const saved = await loadStorage(THEME_KEY, 'light')
  elements.app.dataset.theme = saved
}

/**
 * 保存设置选项
 */
async function saveOptions() {
  const options = {
    showArrayLength: elements.showArrayLength.checked,
    showSampleValue: elements.showSampleValue.checked,
    keysOnly: elements.keysOnly.checked,
    compactMode: elements.compactMode.checked,
    maxDepth: elements.maxDepth.value,
    outputFormat: elements.outputFormat.value
  }
  await saveStorage(OPTIONS_KEY, options)
}

/**
 * 加载设置选项
 */
async function loadOptions() {
  const options = await loadStorage(OPTIONS_KEY, null)
  if (options) {
    elements.showArrayLength.checked = options.showArrayLength ?? true
    elements.showSampleValue.checked = options.showSampleValue ?? false
    elements.keysOnly.checked = options.keysOnly ?? true
    elements.compactMode.checked = options.compactMode ?? false
    elements.maxDepth.value = options.maxDepth ?? '0'
    elements.outputFormat.value = options.outputFormat ?? 'structure'
  }
}

// ==================== 选项卡切换 ====================

/**
 * 切换选项卡
 */
function switchTab(tabName) {
  currentTab = tabName
  
  // 更新选项卡激活状态
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName)
  })

  // 更新面板显示
  document.querySelectorAll('.pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabName + 'Pane')
  })
}

// ==================== 事件绑定 ====================

// 提取按钮
elements.extractBtn.addEventListener('click', () => {
  const inputText = elements.jsonInput.value.trim()
  if (!inputText) {
    showToast('请先粘贴 JSON 数据', 'error')
    return
  }

  const startTime = performance.now()
  updateStatus('处理中...')

  try {
    const jsonData = JSON.parse(inputText)
    const options = getOptions()
    const stats = getJsonStats(jsonData)
    elements.inputStats.textContent = `${stats.keys} 个键 · ${stats.depth} 层`

    let outputHtml, outputText

    if (options.format === 'typescript') {
      outputHtml = formatTypeScript(jsonData)
      outputText = typeScriptToText(jsonData)
      structureResult = { type: 'typescript', data: jsonData }
    } else {
      structureResult = { type: 'structure', data: extractStructure(jsonData, options) }
      outputHtml = formatOutput(structureResult.data, 0, options.compact)
      outputText = structureToText(structureResult.data, 0, options.compact)
    }

    elements.output.innerHTML = outputHtml

    const processTime = (performance.now() - startTime).toFixed(1)
    updateStatus(`完成 (${processTime}ms)`)
    
    saveToHistory(inputText, outputText)
    showToast('提取成功！')
  } catch (e) {
    elements.output.innerHTML = `<span style="color: #ef4444;">JSON 解析错误：${escapeHtml(e.message)}</span>`
    showToast('JSON 格式错误', 'error')
    updateStatus('错误')
    structureResult = null
  }
})

// 复制按钮
elements.copyBtn.addEventListener('click', async () => {
  if (!structureResult) {
    showToast('请先提取数据结构', 'error')
    return
  }

  try {
    const options = getOptions()
    let text
    
    if (structureResult.type === 'typescript') {
      text = typeScriptToText(structureResult.data)
    } else {
      text = structureToText(structureResult.data, 0, options.compact)
    }

    await navigator.clipboard.writeText(text)
    showToast('已复制到剪贴板！')
  } catch (e) {
    showToast('复制失败', 'error')
  }
})

// 粘贴按钮
elements.pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText()
    elements.jsonInput.value = text
    
    try {
      const data = JSON.parse(text)
      const stats = getJsonStats(data)
      elements.inputStats.textContent = `${stats.keys} 个键 · ${stats.depth} 层`
    } catch {
      elements.inputStats.textContent = ''
    }
    
    showToast('已粘贴')
  } catch (e) {
    showToast('无法访问剪贴板', 'error')
  }
})

// 格式化按钮
elements.formatBtn.addEventListener('click', () => {
  const inputText = elements.jsonInput.value.trim()
  if (!inputText) {
    showToast('请先粘贴 JSON 数据', 'error')
    return
  }

  try {
    const jsonData = JSON.parse(inputText)
    elements.jsonInput.value = JSON.stringify(jsonData, null, 2)
    showToast('格式化成功！')
  } catch (e) {
    showToast('JSON 格式错误', 'error')
  }
})

// 清空按钮 - 根据当前页签清空对应内容
elements.clearBtn.addEventListener('click', () => {
  if (currentTab === 'extract') {
    elements.jsonInput.value = ''
    elements.output.innerHTML = ''
    elements.inputStats.textContent = ''
    elements.outputStats.textContent = ''
    structureResult = null
  } else if (currentTab === 'compare') {
    elements.compareInputA.value = ''
    elements.compareInputB.value = ''
    elements.compareOutput.innerHTML = ''
  }
  updateStatus('就绪')
})

// 设置按钮
elements.settingsBtn.addEventListener('click', () => {
  elements.optionsPanel.classList.toggle('show')
})

// 主题按钮
elements.themeBtn.addEventListener('click', toggleTheme)

// 历史按钮 - 点击切换显示，点击外部自动关闭
elements.historyBtn.addEventListener('click', (e) => {
  e.stopPropagation() // 阻止冒泡
  elements.historyPanel.classList.toggle('show')
})

// 清空历史
elements.clearHistoryBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(HISTORY_KEY)
  historyCache = [] // 清除缓存
  renderHistory()
  showToast('历史已清空')
})

// 历史记录点击
elements.historyList.addEventListener('click', (e) => {
  const item = e.target.closest('.history-item')
  if (item) loadHistoryItem(item.dataset.id)
})

// 选项卡切换
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab))
})

// 对比按钮
elements.compareBtn.addEventListener('click', () => {
  const textA = elements.compareInputA.value.trim()
  const textB = elements.compareInputB.value.trim()

  if (!textA || !textB) {
    showToast('请输入两个 JSON 进行对比', 'error')
    return
  }

  try {
    const jsonA = JSON.parse(textA)
    const jsonB = JSON.parse(textB)
    const result = compareStructures(jsonA, jsonB)
    elements.compareOutput.innerHTML = formatCompareResult(result)
    showToast('对比完成！')
  } catch (e) {
    elements.compareOutput.innerHTML = `<span style="color: #ef4444;">JSON 解析错误：${escapeHtml(e.message)}</span>`
    showToast('JSON 格式错误', 'error')
  }
})

// 快捷键
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    elements.extractBtn.click()
  }
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault()
    elements.copyBtn.click()
  }
})

// 输入框内容变化
elements.jsonInput.addEventListener('input', () => {
  const text = elements.jsonInput.value.trim()
  if (!text) {
    elements.inputStats.textContent = ''
    return
  }

  try {
    const data = JSON.parse(text)
    const stats = getJsonStats(data)
    elements.inputStats.textContent = `${stats.keys} 个键 · ${stats.depth} 层`
  } catch {
    elements.inputStats.textContent = '无效 JSON'
  }
})

// 点击外部关闭历史面板（使用捕获阶段确保先于其他事件）
document.addEventListener('click', (e) => {
  const historyPanel = document.getElementById('historyPanel')
  const historyBtn = document.getElementById('historyBtn')
  
  if (historyPanel && historyPanel.classList.contains('show')) {
    // 如果点击的不是历史面板内部和历史按钮
    if (!historyPanel.contains(e.target) && e.target !== historyBtn && !historyBtn.contains(e.target)) {
      historyPanel.classList.remove('show')
    }
  }
}, true) // 使用捕获阶段

// 选项变化时保存
;[elements.showArrayLength, elements.showSampleValue, elements.keysOnly, 
  elements.compactMode, elements.maxDepth, elements.outputFormat].forEach(el => {
  el.addEventListener('change', saveOptions)
})

// ==================== 初始化 ====================
;(async function init() {
  // 首先迁移旧数据
  await migrateFromLocalStorage()
  // 然后初始化各模块
  await initTheme()
  await loadOptions()
  await initHistory()
  // 设置选项默认不显示
  elements.optionsPanel.classList.remove('show')
})()
