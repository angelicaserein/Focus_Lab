/**
 * 全局 JSDoc 类型定义。
 * 在各 context / utils 文件顶部 `import "./types"` 即可激活编辑器类型提示，无需任何运行时依赖。
 */

// ── 任务属性选项 ─────────────────────────────────────────────────────────────

/**
 * @typedef {{ id: string, label: string, color?: string, icon?: string, sortWeight?: number }} AttrOption
 */

// ── 任务属性定义 ─────────────────────────────────────────────────────────────

/**
 * @typedef {'select' | 'multiselect' | 'date' | 'number' | 'text'} AttrType
 *
 * @typedef {{
 *   id:       string,
 *   name:     string,
 *   type:     AttrType,
 *   system:   boolean,
 *   visible:  boolean,
 *   order:    number,
 *   options?: AttrOption[],
 *   unit?:    string,
 * }} TaskAttr
 */

// ── 任务属性值集合（todo.attrs） ─────────────────────────────────────────────

/**
 * @typedef {{
 *   priority?:      'urgent' | 'high' | 'medium' | 'low',
 *   tags?:          string[],
 *   dueDate?:       string,
 *   estimatedMins?: number,
 *   notes?:         string,
 *   [key: string]:  any,
 * }} TodoAttrs
 */

// ── 待办 ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id:             string,
 *   text:           string,
 *   completed:      boolean,
 *   createdAt:      number,
 *   recurringDays?: number[],
 *   lastResetDate?: string,
 *   attrs?:         TodoAttrs,
 * }} Todo
 */

// ── 情景 ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id:          string,
 *   title:       string,
 *   description: string,
 *   createdAt:   number,
 *   settings?:   Record<string, unknown>,
 * }} Scenario
 */

// ── 专注记录 ─────────────────────────────────────────────────────────────────

/**
 * @typedef {'completed' | 'removed' | 'ended'} FocusOutcome
 *
 * @typedef {{
 *   id:                string,
 *   taskId:            string,
 *   taskText:          string,
 *   durationSecs:      number,
 *   startedAt:         number,
 *   endedAt:           number,
 *   sessionId:         string,
 *   outcome:           FocusOutcome,
 *   scenarioId?:       string,
 *   scenarioTitle?:    string,
 *   coinsEarned?:      number,
 *   distractionCount?: number,
 *   distractionSecs?:  number,
 *   noteCount?:        number,
 *   events?:           SessionEvent[],
 * }} FocusRecord
 */

// ── 会话事件 ─────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   type: string,
 *   ts:   number,
 *   [key: string]: unknown,
 * }} SessionEvent
 */

// ── 分心记录 ─────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id:       string,
 *   ts:       number,
 *   tag?:     string,
 *   note?:    string,
 *   secs?:    number,
 *   type?:    'reactive' | 'proactive',
 * }} DistractionRecord
 */

// ── 研究记录 ─────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   dateStr:   string,
 *   scales:    Record<string, number>,
 *   retro:     string,
 *   autoData:  Record<string, unknown>,
 * }} ResearchRecord
 */

export {};
