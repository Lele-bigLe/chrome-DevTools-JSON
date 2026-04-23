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
  sortKeys: $('sortKeys'),
  searchInput: $('searchInput'),

  // 对比模式
  compareInputA: $('compareInputA'),
  compareInputB: $('compareInputB'),
  compareOutput: $('compareOutput'),

  // URL 参数解析
  urlInput: $('urlInput'),
  urlCurrentTabBtn: $('urlCurrentTabBtn'),
  urlPasteBtn: $('urlPasteBtn'),
  urlParseBtn: $('urlParseBtn'),
  urlCopyJsonBtn: $('urlCopyJsonBtn'),
  urlClearBtn: $('urlClearBtn'),
  urlParamsResult: $('urlParamsResult'),
  urlParamsStats: $('urlParamsStats'),

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
    sortKeys: elements.sortKeys.checked,
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
  const { showLength = true, showSample = false, keysOnly = false, sortKeys = false, maxDepth = 0 } = options

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
    let keys = Object.keys(data)
    if (keys.length === 0) return {}

    // 键名排序
    if (sortKeys) keys = keys.slice().sort()

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
  // 都是数组 - 合并所有元素 key union 后对比
  else if (typeA === 'array') {
    if (a.length > 0 && b.length > 0) {
      // 将数组中所有对象元素的 key 合并，避免仅取 [0] 漏检异构数组
      const mergeItems = arr => {
        const objItems = arr.filter(x => x && typeof x === 'object' && !Array.isArray(x))
        if (objItems.length === 0) return arr[0]
        return Object.assign({}, ...objItems)
      }
      const sub = compareStructures(mergeItems(a), mergeItems(b), path + '[]')
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

    let rows = ''
    keys.forEach((key, index) => {
      const value = formatOutput(structure[key], indent + 1, compact)
      const comma = index < keys.length - 1 ? ',' : ''
      const lineSpaces = compact ? '' : '  '.repeat(indent + 1)
      rows += `${lineSpaces}<span class="key">"${escapeHtml(key)}"</span>: ${value}${comma}${newline}`
    })
    const foldBtn = compact ? '' : '<span class="fold-btn" title="折叠/展开">−</span>'
    return `<span class="node">${foldBtn}<span class="bracket">{</span><span class="node-ellipsis"> … }</span><span class="node-body">${newline}${rows}${spaces}</span><span class="node-close bracket">}</span></span>`
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
async function saveToHistory(input, output = '') {
  const history = historyCache || await loadStorage(HISTORY_KEY, [])
  
  // 限制单条记录大小（chrome.storage.local 有 5MB 配额，100KB 每条完全够用）
  const maxInputLength = 100000
  const item = {
    id: Date.now(),
    input: input.length > maxInputLength ? input.slice(0, maxInputLength) : input,
    preview: input.slice(0, 60).replace(/\s+/g, ' '),
    time: new Date().toLocaleString(),
    truncated: input.length > maxInputLength,
    output
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
  const history = historyCache || []
  const item = history.find(h => h.id === parseInt(id))
  if (!item) return

  switchTab('extract')
  elements.jsonInput.value = item.input
  elements.historyPanel.classList.remove('show')

  // 有已保存的 output 直接渲染，无需重新提取
  if (item.output) {
    const outputLines = item.output.split(String.fromCharCode(10)).length
    elements.output.textContent = item.output
    elements.outputStats.textContent = `${outputLines} 行`
    structureResult = null
    updateStatus('历史记录')
    if (item.truncated) showToast('输入数据过大，已截断；结果来自历史缓存', '')
    return
  }

  // 旧条目无 output 字段，截断时无法提取
  if (item.truncated) {
    showToast('数据过大，历史仅保存了部分内容，自动提取已跳过', '')
    return
  }

  setTimeout(() => elements.extractBtn.click(), 50)
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
    displayMode: elements.showSampleValue.checked ? 'showSample' : 'keysOnly',
    compactMode: elements.compactMode.checked,
    sortKeys: elements.sortKeys.checked,
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

    // 处理单选按钮组
    const displayMode = options.displayMode ?? 'keysOnly'
    if (displayMode === 'showSample') {
      elements.showSampleValue.checked = true
      elements.keysOnly.checked = false
    } else {
      elements.showSampleValue.checked = false
      elements.keysOnly.checked = true
    }

    elements.compactMode.checked = options.compactMode ?? false
    elements.sortKeys.checked = options.sortKeys ?? false
    elements.maxDepth.value = options.maxDepth ?? '0'
    elements.outputFormat.value = options.outputFormat ?? 'structure'
  }
}

// ==================== URL 参数解析 ====================

/**
 * 从 URL 中提取查询参数字符串
 * 支持标准 URL 和 Hash 路由（如 /#/path?key=value）
 */
function extractQueryString(urlStr) {
  // Hash 路由中的参数（优先）
  const hashIdx = urlStr.indexOf('#')
  if (hashIdx !== -1) {
    const hashPart = urlStr.slice(hashIdx + 1)
    const qIdx = hashPart.indexOf('?')
    if (qIdx !== -1) {
      return hashPart.slice(qIdx + 1)
    }
  }
  // 标准 query string
  const qIdx = urlStr.indexOf('?')
  if (qIdx !== -1) {
    return urlStr.slice(qIdx + 1)
  }
  return ''
}

/**
 * 解析查询参数列表
 */
function parseUrlParams(urlStr) {
  const qs = extractQueryString(urlStr.trim())
  if (!qs) return []

  return qs.split('&').map((pair, index) => {
    const eqIdx = pair.indexOf('=')
    const rawKey = eqIdx === -1 ? pair : pair.slice(0, eqIdx)
    const raw = eqIdx === -1 ? '' : pair.slice(eqIdx + 1)
    let key = rawKey
    let decoded = raw
    try { key = decodeURIComponent(rawKey.replace(/\+/g, '%20')) } catch (e) { /* 保留原始值 */ }
    try { decoded = decodeURIComponent(raw.replace(/\+/g, '%20')) } catch (e) { /* 保留原始值 */ }
    return { index: index + 1, key, raw, decoded }
  }).filter(p => p.key !== '')
}

/**
 * 提取编辑器中有效的 URL 参数
 */
function getEffectiveUrlParams(params) {
  return params
    .map((param) => ({
      key: typeof param.key === 'string' ? param.key.trim() : '',
      decoded: typeof param.decoded === 'string' ? param.decoded : ''
    }))
    .filter(param => param.key !== '')
    .map((param, index) => ({
      index: index + 1,
      key: param.key,
      decoded: param.decoded,
      raw: encodeURIComponent(param.decoded)
    }))
}

/**
 * 拆分 URL，保留 query 应该写回的位置
 */
function splitUrlForParams(urlStr) {
  const hashIdx = urlStr.indexOf('#')

  if (hashIdx !== -1) {
    const beforeHash = urlStr.slice(0, hashIdx)
    const hashPart = urlStr.slice(hashIdx + 1)
    const hashQueryIdx = hashPart.indexOf('?')

    if (hashQueryIdx !== -1) {
      return {
        prefix: `${beforeHash}#${hashPart.slice(0, hashQueryIdx)}`,
        suffix: ''
      }
    }

    if (hashPart.startsWith('/') || hashPart.startsWith('!/')) {
      return {
        prefix: urlStr,
        suffix: ''
      }
    }

    const normalQueryIdx = beforeHash.indexOf('?')
    if (normalQueryIdx !== -1) {
      return {
        prefix: beforeHash.slice(0, normalQueryIdx),
        suffix: urlStr.slice(hashIdx)
      }
    }

    return {
      prefix: beforeHash,
      suffix: urlStr.slice(hashIdx)
    }
  }

  const queryIdx = urlStr.indexOf('?')
  if (queryIdx !== -1) {
    return {
      prefix: urlStr.slice(0, queryIdx),
      suffix: ''
    }
  }

  return {
    prefix: urlStr,
    suffix: ''
  }
}

/**
 * 重新组装 URL
 */
function buildUrlWithParams(urlStr, params) {
  const { prefix, suffix } = splitUrlForParams(urlStr.trim())
  const effectiveParams = getEffectiveUrlParams(params)

  if (effectiveParams.length === 0) {
    return `${prefix}${suffix}`
  }

  const queryString = effectiveParams
    .map(param => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.decoded)}`)
    .join('&')

  return `${prefix}?${queryString}${suffix}`
}

/**
 * 读取参数编辑器当前内容
 */
function collectUrlParamsFromEditor() {
  return Array.from(elements.urlParamsResult.querySelectorAll('.param-row')).map(row => ({
    key: row.querySelector('.param-key-input')?.value || '',
    decoded: row.querySelector('.param-value-input')?.value || ''
  }))
}

/**
 * 获取参数的编码预览
 */
function getParamPreviewHtml(key, decoded) {
  const trimmedKey = key.trim()
  if (!trimmedKey) {
    return '<span class="param-preview-empty">键名为空时不会回填</span>'
  }

  return escapeHtml(`${encodeURIComponent(trimmedKey)}=${encodeURIComponent(decoded)}`)
}

/**
 * 刷新参数统计
 */
function updateUrlParamsStats(params) {
  const effectiveParams = getEffectiveUrlParams(params)
  elements.urlParamsStats.textContent = `共 ${effectiveParams.length} 个参数`
}

/**
 * 获取当前激活标签页的 URL
 */
function getCurrentTabUrl() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      const activeTab = tabs?.[0]
      if (!activeTab) {
        reject(new Error('未找到当前标签页'))
        return
      }

      if (!activeTab.url) {
        reject(new Error('当前页面地址不可读取'))
        return
      }

      resolve(activeTab.url)
    })
  })
}

/**
 * 渲染 URL 参数到结果区域
 */
function renderUrlParams(params) {
  const el = elements.urlParamsResult
  const editorParams = Array.isArray(params) ? params : []

  updateUrlParamsStats(editorParams)

  const rows = editorParams.map((param, index) => {
    const key = param.key || ''
    const decoded = param.decoded || ''
    return `
      <tr class="param-row" data-row-index="${index}">
        <td class="param-index">${index + 1}</td>
        <td>
          <input class="param-input param-key-input" type="text" value="${escapeHtml(key)}" placeholder="如 token">
        </td>
        <td>
          <input class="param-input param-value-input" type="text" value="${escapeHtml(decoded)}" placeholder="参数值">
        </td>
        <td class="param-raw-col">${getParamPreviewHtml(key, decoded)}</td>
        <td class="param-actions">
          <div class="param-action-group">
            <button class="param-mini-btn" data-url-action="copy" title="复制参数值">复制</button>
            <button class="param-mini-btn danger" data-url-action="delete" title="删除这一行">删除</button>
          </div>
        </td>
      </tr>`
  }).join('')

  el.innerHTML = `
    <div class="url-param-editor-toolbar">
      <span class="url-editor-tip">支持直接编辑、新增、删除，然后回填到上方输入框</span>
      <div class="url-param-editor-actions">
        <button class="toolbar-btn" data-url-action="add">新增参数</button>
        <button class="toolbar-btn primary" data-url-action="apply">回填输入框</button>
      </div>
    </div>
    ${editorParams.length === 0 ? '<div class="url-params-placeholder">未找到参数，可点击“新增参数”继续编辑</div>' : `
      <table class="params-table">
        <thead>
          <tr>
            <th>#</th>
            <th>参数名</th>
            <th>参数值</th>
            <th>编码预览</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `}`
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
    elements.outputStats.textContent = `${outputText.split(String.fromCharCode(10)).length} 行`
    elements.searchInput.value = ''

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
  } else if (currentTab === 'urlParams') {
    elements.urlInput.value = ''
    elements.urlParamsResult.innerHTML = '<div class="url-params-placeholder">请输入 URL 后点击「解析」</div>'
    elements.urlParamsStats.textContent = ''
  }
  updateStatus('就绪')
})

// ==================== URL 参数事件 ====================

// 获取当前页面 URL
elements.urlCurrentTabBtn.addEventListener('click', async () => {
  try {
    const currentUrl = await getCurrentTabUrl()
    elements.urlInput.value = currentUrl

    const params = parseUrlParams(currentUrl)
    renderUrlParams(params)
    updateStatus('已读取当前页')

    if (params.length > 0) {
      showToast(`已获取并解析当前页 URL，共 ${params.length} 个参数`)
    } else {
      showToast('已获取当前页 URL')
    }
  } catch (e) {
    showToast(e.message || '读取当前页失败', 'error')
    updateStatus('错误')
  }
})

// 粘贴 URL
elements.urlPasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText()
    elements.urlInput.value = text
    showToast('已粘贴')
  } catch (e) {
    showToast('无法访问剪贴板', 'error')
  }
})

// 解析 URL 参数
elements.urlParseBtn.addEventListener('click', () => {
  const urlStr = elements.urlInput.value.trim()
  if (!urlStr) {
    showToast('请先输入 URL 地址', 'error')
    return
  }
  const params = parseUrlParams(urlStr)
  renderUrlParams(params)
  if (params.length > 0) {
    showToast(`解析完成，共 ${params.length} 个参数`)
  } else {
    showToast('未找到任何参数', 'error')
  }
})

// 复制为 JSON
elements.urlCopyJsonBtn.addEventListener('click', async () => {
  const editorParams = collectUrlParamsFromEditor()
  const params = editorParams.length > 0
    ? getEffectiveUrlParams(editorParams)
    : getEffectiveUrlParams(parseUrlParams(elements.urlInput.value.trim()))

  if (params.length === 0) {
    showToast('请先输入 URL 地址', 'error')
    return
  }

  // 转换为 key-value 对象
  const obj = {}
  params.forEach(p => { obj[p.key] = p.decoded })
  try {
    await navigator.clipboard.writeText(JSON.stringify(obj, null, 2))
    showToast('已复制 JSON！')
  } catch (e) {
    showToast('复制失败', 'error')
  }
})

// 清空 URL 输入
elements.urlClearBtn.addEventListener('click', () => {
  elements.urlInput.value = ''
  elements.urlParamsResult.innerHTML = '<div class="url-params-placeholder">请输入 URL 后点击「解析」</div>'
  elements.urlParamsStats.textContent = ''
  updateStatus('就绪')
})

// 输入框按 Enter 自动解析（Ctrl+Enter）
elements.urlInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    elements.urlParseBtn.click()
  }
})

// 参数表交互
elements.urlParamsResult.addEventListener('click', async (e) => {
  const actionBtn = e.target.closest('[data-url-action]')
  if (!actionBtn) return

  const action = actionBtn.dataset.urlAction

  if (action === 'add') {
    renderUrlParams([...collectUrlParamsFromEditor(), { key: '', decoded: '' }])
    updateStatus('已新增参数行')
    return
  }

  if (action === 'apply') {
    const currentUrl = elements.urlInput.value.trim()
    if (!currentUrl) {
      showToast('请先输入 URL 地址', 'error')
      return
    }

    const nextUrl = buildUrlWithParams(currentUrl, collectUrlParamsFromEditor())
    elements.urlInput.value = nextUrl
    renderUrlParams(parseUrlParams(nextUrl))
    updateStatus('已回填 URL')
    showToast('已回填到输入框')
    return
  }

  const row = actionBtn.closest('.param-row')
  if (!row) return

  if (action === 'copy') {
    const value = row.querySelector('.param-value-input')?.value || ''
    try {
      await navigator.clipboard.writeText(value)
      showToast('已复制！')
    } catch (e) {
      showToast('复制失败', 'error')
    }
    return
  }

  if (action === 'delete') {
    const rowIndex = Number(row.dataset.rowIndex)
    const nextRows = collectUrlParamsFromEditor().filter((item, index) => index !== rowIndex)
    renderUrlParams(nextRows)
    updateStatus('已删除参数行')
  }
})

elements.urlParamsResult.addEventListener('input', (e) => {
  const row = e.target.closest('.param-row')
  if (!row) return

  const key = row.querySelector('.param-key-input')?.value || ''
  const decoded = row.querySelector('.param-value-input')?.value || ''
  const previewCell = row.querySelector('.param-raw-col')

  if (previewCell) {
    previewCell.innerHTML = getParamPreviewHtml(key, decoded)
  }

  updateUrlParamsStats(collectUrlParamsFromEditor())
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
  elements.compactMode, elements.sortKeys, elements.maxDepth, elements.outputFormat].forEach(el => {
  el.addEventListener('change', saveOptions)
})

// ==================== 折叠/展开 ====================

// 点击折叠按钮
elements.output.addEventListener('click', (e) => {
  const btn = e.target.closest('.fold-btn')
  if (!btn) return
  const node = btn.parentElement
  const body = node.querySelector(':scope > .node-body')
  const close = node.querySelector(':scope > .node-close')
  const ellipsis = node.querySelector(':scope > .node-ellipsis')
  if (!body) return
  const collapsed = body.classList.toggle('collapsed')
  if (close) close.classList.toggle('collapsed', collapsed)
  if (ellipsis) ellipsis.classList.toggle('show', collapsed)
  btn.textContent = collapsed ? '+' : '−'
})

// ==================== 搜索 ====================

let searchTimer = null
elements.searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applySearch, 120)
})

function applySearch() {
  const q = elements.searchInput.value.trim().toLowerCase()
  const keys = elements.output.querySelectorAll('.key')
  keys.forEach(el => {
    if (q && el.textContent.toLowerCase().includes(q)) {
      el.classList.add('search-match')
    } else {
      el.classList.remove('search-match')
    }
  })
}

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
