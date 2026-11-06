/**
 * All reader-injected CSS for Moonlit Reader.
 *
 * Design language: "moonlit paper" — warm paper surfaces, amber accent
 * (#FBBF24, borrowed from the Moonlight reference), ink-grey type, hairline
 * borders, soft elevation and short spring-y transitions. Both Zotero's light
 * and dark themes are supported through the reader's own data-color-scheme.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const CSS = `
:root, .ml-ui {
  --ml-amber: #fbbf24;
  --ml-amber-deep: #e0a30b;
  --ml-amber-ink: #3b2a05;
  --ml-amber-soft: rgba(251, 191, 36, 0.16);
  --ml-amber-line: rgba(224, 163, 11, 0.55);
  --ml-plum: #4c1d95;
  --ml-paper: #ffffff;
  --ml-surface: #fbfaf7;
  --ml-surface-2: #f2f0ea;
  --ml-ink: #26262b;
  --ml-ink-2: #55555f;
  --ml-ink-3: #6a6a75;
  --ml-ink-4: #90909b;
  --ml-line: rgba(38, 38, 43, 0.09);
  --ml-line-strong: rgba(38, 38, 43, 0.16);
  --ml-shadow-sm: 0 1px 2px rgba(20, 20, 30, 0.06), 0 2px 6px -2px rgba(20, 20, 30, 0.08);
  --ml-shadow-md: 0 2px 4px rgba(20, 20, 30, 0.06), 0 12px 28px -14px rgba(20, 20, 30, 0.28);
  --ml-shadow-pop: 0 8px 16px -6px rgba(20, 20, 30, 0.18), 0 24px 48px -18px rgba(20, 20, 30, 0.32);
  --ml-radius: 12px;
  --ml-radius-sm: 8px;
  --ml-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB",
             "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  --ml-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  --ml-ease: cubic-bezier(0.32, 0.72, 0, 1);
}

:root[data-color-scheme="dark"], [data-color-scheme="dark"] .ml-ui, .ml-ui.ml-dark {
  --ml-paper: #1e1e24;
  --ml-surface: #17171c;
  --ml-surface-2: #26262e;
  --ml-ink: #ececf1;
  --ml-ink-2: #b3b3c0;
  --ml-ink-3: #9c9caa;
  --ml-ink-4: #74747f;
  --ml-line: rgba(255, 255, 255, 0.09);
  --ml-line-strong: rgba(255, 255, 255, 0.18);
  --ml-amber: #f7c948;
  --ml-amber-soft: rgba(247, 201, 72, 0.18);
  --ml-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --ml-shadow-md: 0 2px 6px rgba(0, 0, 0, 0.36), 0 16px 32px -18px rgba(0, 0, 0, 0.7);
  --ml-shadow-pop: 0 10px 20px -8px rgba(0, 0, 0, 0.6), 0 28px 56px -20px rgba(0, 0, 0, 0.8);
}

/* ---------------------------------------------------------------- toolbar */
.ml-toolbar-slot {
  display: flex;
  align-items: center;
  padding: 0 3px;
  gap: 3px;
}

button.ml-toolbar-button {
  all: revert;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: auto 0;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  color: var(--fill-primary, var(--ml-ink-2));
  transition: background-color 0.16s var(--ml-ease), box-shadow 0.16s var(--ml-ease),
              color 0.16s var(--ml-ease), transform 0.16s var(--ml-ease);
}

button.ml-toolbar-button:hover {
  background: var(--ml-amber-soft);
  color: var(--ml-ink);
}

button.ml-toolbar-button:active {
  transform: scale(0.94);
}

button.ml-toolbar-button.ml-on {
  color: var(--ml-amber-ink);
  background: linear-gradient(150deg, #ffd970, var(--ml-amber) 55%, #f0a90c);
  border-color: rgba(180, 130, 6, 0.5);
  box-shadow: 0 1px 2px rgba(140, 100, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

button.ml-toolbar-button.ml-open {
  background: var(--ml-surface-2);
  color: var(--ml-ink);
}

button.ml-toolbar-button svg {
  width: 17px;
  height: 17px;
  display: block;
}

.ml-toolbar-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #37c26d;
  box-shadow: 0 0 0 1.5px var(--material-toolbar, #fff);
  opacity: 0;
  transition: opacity 0.2s var(--ml-ease);
}

.ml-toolbar-button.ml-busy .ml-toolbar-dot {
  opacity: 1;
  background: var(--ml-amber-deep);
  animation: ml-pulse 1.1s ease-in-out infinite;
}

@keyframes ml-pulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.55); opacity: 0.45; }
}

/* ---------------------------------------------------------------- popover */
.ml-popover {
  position: fixed;
  top: 46px;
  right: 12px;
  width: 328px;
  z-index: 90;
  font-family: var(--ml-font);
  color: var(--ml-ink);
  background: var(--ml-paper);
  border: 1px solid var(--ml-line);
  border-radius: 16px;
  box-shadow: var(--ml-shadow-pop);
  padding: 14px;
  transform-origin: top right;
  animation: ml-pop-in 0.19s var(--ml-ease);
  -moz-user-select: none;
  user-select: none;
}

.ml-popover.ml-closing {
  animation: ml-pop-out 0.13s ease-in forwards;
}

@keyframes ml-pop-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to { opacity: 1; transform: none; }
}

@keyframes ml-pop-out {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(-4px) scale(0.98); }
}

.ml-pop-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.ml-logo {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #2e2a3f, #17151f);
  color: var(--ml-amber);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 2px 6px -2px rgba(20, 20, 40, 0.5);
  flex: none;
}

.ml-logo svg {
  width: 17px;
  height: 17px;
}

.ml-pop-title {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.ml-pop-title .ml-brand {
  font-size: 13.5px;
  font-weight: 650;
  letter-spacing: 0.1px;
}

.ml-pop-title .ml-sub {
  font-size: 11px;
  color: var(--ml-ink-3);
}

.ml-section-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ml-ink-3);
  margin: 14px 2px 6px;
}

.ml-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 9px;
  border-radius: var(--ml-radius-sm);
  transition: background-color 0.15s var(--ml-ease);
}

.ml-row:hover {
  background: var(--ml-surface-2);
}

.ml-row .ml-row-text {
  flex: 1;
  min-width: 0;
}

.ml-row .ml-row-title {
  font-size: 12.5px;
  font-weight: 550;
  line-height: 1.35;
}

.ml-row .ml-row-desc {
  font-size: 10.5px;
  color: var(--ml-ink-3);
  line-height: 1.35;
  margin-top: 1px;
}

.ml-switch {
  all: revert;
  position: relative;
  flex: none;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  border: none;
  padding: 0;
  background: var(--ml-line-strong);
  cursor: pointer;
  transition: background-color 0.2s var(--ml-ease);
}

.ml-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.24);
  transition: transform 0.22s var(--ml-ease);
}

.ml-switch[aria-checked="true"] {
  background: linear-gradient(180deg, #ffcf5c, var(--ml-amber-deep));
}

.ml-switch[aria-checked="true"]::after {
  transform: translateX(14px);
}

.ml-switch:active::after {
  width: 18px;
}

.ml-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 2px;
}

button.ml-btn {
  all: revert;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid var(--ml-line-strong);
  background: var(--ml-paper);
  color: var(--ml-ink);
  font-family: var(--ml-font);
  font-size: 11.5px;
  font-weight: 550;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s var(--ml-ease), border-color 0.15s var(--ml-ease),
              box-shadow 0.15s var(--ml-ease), transform 0.12s var(--ml-ease), color 0.15s;
  white-space: nowrap;
}

button.ml-btn:hover {
  background: var(--ml-surface-2);
  border-color: var(--ml-line-strong);
  box-shadow: var(--ml-shadow-sm);
}

button.ml-btn:active {
  transform: scale(0.975);
}

button.ml-btn svg {
  width: 13px;
  height: 13px;
}

button.ml-btn.ml-primary {
  background: linear-gradient(180deg, #ffd668, var(--ml-amber) 62%, #eeac0c);
  border-color: rgba(170, 120, 5, 0.45);
  color: var(--ml-amber-ink);
  box-shadow: 0 1px 2px rgba(140, 100, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

button.ml-btn.ml-primary:hover {
  filter: brightness(1.03);
}

button.ml-btn.ml-ghost {
  border-color: transparent;
  background: transparent;
  color: var(--ml-ink-2);
}

button.ml-btn.ml-ghost:hover {
  background: var(--ml-surface-2);
  color: var(--ml-ink);
}

button.ml-btn[disabled] {
  opacity: 0.5;
  cursor: default;
  transform: none;
}

button.ml-icon-btn {
  all: revert;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ml-ink-3);
  cursor: pointer;
  transition: background-color 0.15s var(--ml-ease), color 0.15s var(--ml-ease);
}

button.ml-icon-btn:hover {
  background: var(--ml-surface-2);
  color: var(--ml-ink);
}

button.ml-icon-btn svg {
  width: 14px;
  height: 14px;
}

.ml-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--ml-line);
  font-size: 10.5px;
  color: var(--ml-ink-3);
}

.ml-status .ml-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #37c26d;
  flex: none;
}

.ml-status.ml-warn .ml-dot {
  background: #f0a90c;
}

.ml-status .ml-status-link {
  margin-left: auto;
  color: var(--ml-amber-deep);
  font-weight: 600;
  cursor: pointer;
}

.ml-status .ml-status-link:hover {
  text-decoration: underline;
}

/* ------------------------------------------------------------------- dock */
.ml-dock,
.ml-dock *,
.ml-popover,
.ml-popover *,
.ml-toasts .ml-toast,
.ml-selection-actions * {
  box-sizing: border-box;
}

.ml-dock {
  position: fixed;
  top: 41px;
  right: 0;
  bottom: 0;
  width: var(--ml-dock-width, 430px);
  display: flex;
  flex-direction: column;
  background: var(--ml-surface);
  border-left: 1px solid var(--ml-line);
  box-shadow: -12px 0 32px -24px rgba(20, 20, 30, 0.5);
  z-index: 25;
  font-family: var(--ml-font);
  color: var(--ml-ink);
  transform-origin: right center;
  animation: ml-dock-in 0.24s var(--ml-ease);
  will-change: transform, opacity;
}

.ml-dock.ml-closing {
  animation: ml-dock-out 0.16s ease-in forwards;
}

@keyframes ml-dock-in {
  from { opacity: 0; transform: translateX(22px); }
  to { opacity: 1; transform: none; }
}

@keyframes ml-dock-out {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateX(18px); }
}

body.ml-dock-open #split-view,
body.ml-dock-open .split-view {
  inset-inline-end: var(--ml-dock-width, 430px) !important;
}

body.ml-resizing,
body.ml-resizing * {
  cursor: col-resize;
  user-select: none;
}

.ml-dock-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -7px;
  width: 14px;
  cursor: col-resize;
  z-index: 6;
  touch-action: none;
  background: transparent;
}

.ml-dock-resizer::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 6px;
  width: 2px;
  border-radius: 2px;
  background: transparent;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

/* Grip dots in the middle so the handle reads as "drag me". */
.ml-dock-resizer::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 3px;
  width: 8px;
  height: 26px;
  margin-top: -13px;
  border-radius: 4px;
  background-image: radial-gradient(var(--ml-ink-4) 1px, transparent 1.2px);
  background-size: 4px 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.ml-dock-resizer:hover::before,
.ml-dock-resizer.ml-dragging::before {
  opacity: 0.9;
}

.ml-dock-resizer:hover::after,
.ml-dock-resizer.ml-dragging::after {
  background: var(--ml-amber);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.16);
}

.ml-dock-resizer:focus-visible {
  outline: none;
}

.ml-dock-resizer:focus-visible::after {
  background: var(--ml-amber);
}

.ml-dock-head {
  flex: none;
  padding: 10px 12px 0;
}

.ml-brandbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
}

.ml-brandbar .ml-title {
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ml-brandbar .ml-title .ml-chip {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 5px;
  border-radius: 5px;
  background: var(--ml-amber-soft);
  color: var(--ml-amber-deep);
  text-transform: uppercase;
}

.ml-brandbar .ml-spacer {
  flex: 1;
}

.ml-tabs {
  display: flex;
  gap: 2px;
  margin-top: 8px;
  padding: 3px;
  background: var(--ml-surface-2);
  border-radius: 9px;
}

button.ml-tab {
  all: revert;
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 26px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ml-ink-2);
  font-family: var(--ml-font);
  font-size: 11.5px;
  font-weight: 550;
  cursor: pointer;
  transition: background-color 0.16s var(--ml-ease), color 0.16s var(--ml-ease),
              box-shadow 0.16s var(--ml-ease);
}

button.ml-tab:hover {
  color: var(--ml-ink);
}

button.ml-tab svg {
  width: 12px;
  height: 12px;
}

button.ml-tab.ml-active {
  background: var(--ml-paper);
  color: var(--ml-ink);
  box-shadow: var(--ml-shadow-sm);
}

button.ml-tab .ml-tab-count {
  font-size: 9.5px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--ml-line);
  color: var(--ml-ink-3);
}

.ml-taskbar {
  display: none;
  flex: none;
  padding: 9px 14px 10px;
  border-bottom: 1px solid var(--ml-line);
  background: linear-gradient(180deg, var(--ml-amber-soft, rgba(251, 191, 36, 0.1)), transparent);
}

.ml-taskbar.ml-on {
  display: block;
  animation: ml-taskbar-in 0.18s var(--ml-ease);
}

@keyframes ml-taskbar-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
}

.ml-taskbar-row {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 7px;
}

.ml-taskbar-spinner {
  flex: none;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 1.8px solid var(--ml-amber);
  border-top-color: transparent;
  animation: ml-spin 0.7s linear infinite;
}

@keyframes ml-spin {
  to { transform: rotate(360deg); }
}

.ml-taskbar-text {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.ml-taskbar-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ml-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ml-taskbar-count {
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--ml-amber-ink, var(--ml-ink-3));
  font-weight: 600;
}

.ml-taskbar-track {
  position: relative;
  height: 4px;
  border-radius: 999px;
  background: var(--ml-line);
  overflow: hidden;
}

.ml-skipped {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--ml-surface-2, rgba(120, 120, 140, 0.06));
  color: var(--ml-ink-3, var(--ml-ink-2, #777));
  font-size: 11.5px;
  line-height: 1.5;
}

.ml-tasklist {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 7px;
}

.ml-tasklist[hidden] {
  display: none;
}

/* One row per running feature: the three jobs run in parallel and must not
   overwrite each other's numbers. */
.ml-tasklist-row {
  display: grid;
  grid-template-columns: minmax(64px, auto) 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 3px 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.16s var(--ml-ease);
}

.ml-tasklist-row:hover {
  background: var(--ml-hover, rgba(120, 120, 140, 0.08));
}

.ml-tasklist-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ml-ink-2, var(--ml-ink));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ml-tasklist-track {
  position: relative;
  height: 3px;
  border-radius: 999px;
  background: var(--ml-line);
  overflow: hidden;
}

.ml-tasklist-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--ml-amber), var(--ml-amber-deep, #f59e0b));
  transition: width 0.24s var(--ml-ease);
}

.ml-tasklist-count {
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: var(--ml-ink-3, var(--ml-ink-2, #777));
  white-space: nowrap;
}

.ml-tasklist-paused .ml-tasklist-fill {
  background: var(--ml-line-strong, #c7c7d1);
}

.ml-tasklist-paused .ml-tasklist-label {
  color: var(--ml-ink-3, var(--ml-ink-2, #777));
}

.ml-tasklist-done .ml-tasklist-fill {
  background: var(--ml-green, #34a853);
}

.ml-taskbar.ml-idle .ml-taskbar-spinner {
  display: none;
}

.ml-taskbar-fill {
  height: 100%;
  width: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--ml-amber), var(--ml-amber-deep, #f59e0b));
  transition: width 0.24s var(--ml-ease);
}

.ml-endpoint-hint {
  margin: 2px 0 0 132px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--ml-ink-3);
  word-break: break-all;
}

.ml-taskbar.ml-error {
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.12), transparent);
  border-bottom-color: rgba(220, 38, 38, 0.34);
}

.ml-taskbar.ml-error .ml-taskbar-spinner {
  animation: none;
  border-color: var(--ml-danger, #dc2626);
  border-radius: 2px;
  width: 11px;
  height: 11px;
  transform: rotate(45deg);
}

.ml-taskbar.ml-error .ml-taskbar-label {
  color: var(--ml-danger, #dc2626);
}

.ml-taskbar.ml-error .ml-taskbar-fill {
  background: var(--ml-danger, #dc2626);
  opacity: 0.5;
}

.ml-taskbar-close {
  flex: none;
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--ml-ink-3);
  font-size: 15px;
  line-height: 1;
  padding: 0 2px;
  cursor: pointer;
}

.ml-taskbar-close:hover {
  color: var(--ml-ink);
}

.ml-taskbar-detail {
  margin-top: 6px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--ml-ink-2);
  white-space: pre-wrap;
  word-break: break-all;
}

.ml-taskbar.ml-indeterminate .ml-taskbar-fill {
  animation: ml-taskbar-slide 1.15s ease-in-out infinite;
}

@keyframes ml-taskbar-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(320%); }
}

.ml-usage {
  display: none;
  flex: none;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-top: 1px solid var(--ml-line);
  background: var(--ml-surface-2, rgba(46, 46, 46, 0.04));
  font-size: 10.5px;
  color: var(--ml-ink-3);
  letter-spacing: 0.01em;
}

.ml-usage.ml-on {
  display: flex;
}

.ml-usage-icon {
  display: inline-flex;
  color: var(--ml-amber);
}

.ml-usage-icon svg {
  width: 11px;
  height: 11px;
}

.ml-usage-value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--ml-ink-2, var(--ml-ink));
}

.ml-usage-detail {
  margin-left: 4px;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--ml-line);
  color: var(--ml-ink-3);
  font-size: 9.5px;
}

.ml-usage-detail:empty {
  display: none;
}

.ml-empty-hint {
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--ml-ink-3);
  line-height: 1.6;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--ml-surface-2, rgba(46, 46, 46, 0.04));
  border: 1px dashed var(--ml-line);
}

.ml-hint {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--ml-ink-3);
}

.ml-dock-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 10px 12px 20px;
  scrollbar-width: thin;
}

.ml-dock-body::-webkit-scrollbar {
  width: 8px;
}

.ml-dock-body::-webkit-scrollbar-thumb {
  background: var(--ml-line-strong);
  border-radius: 4px;
}

.ml-view {
  display: none;
  flex-direction: column;
  gap: 8px;
}

.ml-view.ml-active {
  display: flex;
  animation: ml-fade 0.2s var(--ml-ease);
}

@keyframes ml-fade {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}

/* --------------------------------------------------------------- controls */
.ml-toolrow {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.ml-toolrow .ml-grow {
  flex: 1;
}

.ml-mutelabel {
  font-size: 10.5px;
  color: var(--ml-ink-3);
}

.ml-progress {
  height: 3px;
  border-radius: 3px;
  background: var(--ml-line);
  overflow: hidden;
  flex: none;
}

.ml-progress > div {
  height: 100%;
  width: 0%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--ml-amber), var(--ml-amber-deep));
  transition: width 0.3s var(--ml-ease);
}

/* ----------------------------------------------------------- translation */
.ml-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px;
}

.ml-page-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0 2px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--ml-ink-3);
  text-transform: uppercase;
}

.ml-page-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--ml-line);
}

.ml-para {
  position: relative;
  padding: 9px 11px 10px 13px;
  border-radius: 10px;
  background: var(--ml-paper);
  border: 1px solid var(--ml-line);
  box-shadow: var(--ml-shadow-sm);
  cursor: default;
  transition: border-color 0.16s var(--ml-ease), box-shadow 0.16s var(--ml-ease),
              transform 0.16s var(--ml-ease), background-color 0.16s;
}

.ml-para::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 11px;
  bottom: 11px;
  width: 2px;
  border-radius: 2px;
  background: transparent;
  transition: background-color 0.16s var(--ml-ease);
}

.ml-para:hover {
  border-color: var(--ml-line-strong);
  box-shadow: var(--ml-shadow-md);
}

.ml-para.ml-active {
  border-color: var(--ml-amber-line);
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.07), transparent 60%), var(--ml-paper);
  box-shadow: 0 0 0 3px var(--ml-amber-soft), var(--ml-shadow-md);
}

.ml-para.ml-active::before {
  background: var(--ml-amber);
}

.ml-seg {
  position: relative;
  border-radius: 6px;
  padding: 1px 2px;
  margin: 0 -2px;
  transition: background-color 0.14s var(--ml-ease);
}

.ml-seg:hover,
.ml-seg.ml-hot {
  background: var(--ml-amber-soft);
}

.ml-seg.ml-hot {
  box-shadow: inset 0 0 0 1px var(--ml-amber-line);
}

.ml-seg .ml-trans {
  font-size: 13.5px;
  line-height: 1.66;
  color: var(--ml-ink);
  letter-spacing: 0.01em;
  word-break: break-word;
}

.ml-seg .ml-src {
  margin-top: 3px;
  font-size: 10.5px;
  line-height: 1.5;
  color: var(--ml-ink-3);
  border-left: 2px solid var(--ml-line);
  padding-left: 7px;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ml-para.ml-hide-src .ml-src {
  display: none;
}

.ml-para.ml-active .ml-seg:hover .ml-src,
.ml-mini-actions .ml-icon-btn {
  color: var(--ml-ink-3);
}

.ml-mini-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.15s var(--ml-ease);
}

.ml-para:hover .ml-mini-actions {
  opacity: 1;
}

.ml-mini-actions button.ml-icon-btn {
  width: 20px;
  height: 20px;
}

.ml-loading-text {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  height: 18px;
}

.ml-loading-text i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--ml-amber-deep);
  animation: ml-bounce 1s infinite ease-in-out;
}

.ml-loading-text i:nth-child(2) { animation-delay: 0.12s; }
.ml-loading-text i:nth-child(3) { animation-delay: 0.24s; }

@keyframes ml-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
  40% { transform: translateY(-4px); opacity: 1; }
}

.ml-skeleton {
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(90deg, var(--ml-surface-2) 25%, rgba(0, 0, 0, 0.06) 37%, var(--ml-surface-2) 63%);
  background-size: 300% 100%;
  animation: ml-shimmer 1.5s ease-in-out infinite;
}

:root[data-color-scheme="dark"] .ml-skeleton {
  background: linear-gradient(90deg, var(--ml-surface-2) 25%, rgba(255, 255, 255, 0.08) 37%, var(--ml-surface-2) 63%);
  background-size: 300% 100%;
}

@keyframes ml-shimmer {
  from { background-position: 150% 0; }
  to { background-position: -50% 0; }
}

/* --------------------------------------------------------------- summary */
.ml-summary {
  font-size: 13.5px;
  line-height: 1.72;
  color: var(--ml-ink);
  word-break: break-word;
}

.ml-summary .ml-h1,
.ml-summary .ml-h2,
.ml-summary h1,
.ml-summary h2 {
  font-size: 14px;
  font-weight: 680;
  line-height: 1.4;
  letter-spacing: 0.005em;
  color: var(--ml-ink);
  margin: 18px 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ml-line);
  display: flex;
  align-items: center;
  gap: 7px;
}

.ml-summary h1:first-child,
.ml-summary h2:first-child,
.ml-summary h3:first-child {
  margin-top: 2px;
}

.ml-summary h1::before,
.ml-summary h2::before,
.ml-summary .ml-h1::before,
.ml-summary .ml-h2::before {
  content: "";
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--ml-amber), var(--ml-amber-deep));
  flex: none;
}

.ml-summary h3,
.ml-summary .ml-h3 {
  font-size: 13.5px;
  font-weight: 650;
  line-height: 1.45;
  color: var(--ml-ink-2);
  margin: 13px 0 4px;
}

.ml-summary p {
  margin: 6px 0;
}

.ml-summary ul,
.ml-summary ol {
  margin: 4px 0;
  padding-left: 16px;
}

.ml-summary li {
  margin: 4px 0;
}

.ml-summary li::marker {
  color: var(--ml-amber-deep);
}

.ml-summary strong {
  font-weight: 650;
  color: var(--ml-ink);
  background: linear-gradient(transparent 62%, var(--ml-amber-soft) 0);
}

.ml-summary code {
  font-family: var(--ml-mono);
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--ml-surface-2);
}

.ml-summary blockquote {
  margin: 8px 0;
  padding: 7px 10px;
  border-radius: 8px;
  border-left: 2px solid var(--ml-amber);
  background: var(--ml-surface-2);
  color: var(--ml-ink-2);
  font-size: 11.5px;
}

.ml-summary hr {
  border: 0;
  height: 1px;
  background: var(--ml-line);
  margin: 10px 0;
}

.ml-summary .ml-link {
  color: var(--ml-amber-deep);
}

.ml-caret {
  display: inline-block;
  width: 6px;
  height: 12px;
  margin-left: 2px;
  vertical-align: -1px;
  border-radius: 1px;
  background: var(--ml-amber-deep);
  animation: ml-blink 1s steps(2) infinite;
}

@keyframes ml-blink {
  50% { opacity: 0; }
}

.ml-meta-card {
  border-radius: 10px;
  border: 1px solid var(--ml-line);
  background: linear-gradient(170deg, var(--ml-amber-soft), transparent 55%), var(--ml-paper);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ml-meta-card .ml-meta-title {
  font-size: 12.5px;
  font-weight: 650;
  line-height: 1.4;
}

.ml-meta-card .ml-meta-sub {
  font-size: 10.5px;
  color: var(--ml-ink-3);
  line-height: 1.45;
}

/* -------------------------------------------------------------- highlights */
.ml-point {
  position: relative;
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px 9px 30px;
  border-radius: 10px;
  border: 1px solid var(--ml-line);
  background: var(--ml-paper);
  box-shadow: var(--ml-shadow-sm);
  cursor: pointer;
  transition: border-color 0.16s var(--ml-ease), box-shadow 0.16s var(--ml-ease),
              transform 0.16s var(--ml-ease);
}

.ml-point:hover {
  border-color: var(--ml-line-strong);
  box-shadow: var(--ml-shadow-md);
  transform: translateY(-1px);
}

.ml-point.ml-active {
  border-color: var(--ml-amber-line);
  box-shadow: 0 0 0 3px var(--ml-amber-soft);
}

.ml-point .ml-swatch {
  position: absolute;
  left: 10px;
  top: 10px;
  width: 12px;
  height: 12px;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
}

.ml-point .ml-point-quote {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--ml-ink);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ml-point .ml-point-note {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--ml-ink-2);
}

.ml-point .ml-point-foot {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  color: var(--ml-ink-3);
}

.ml-badge {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--ml-surface-2);
  color: var(--ml-ink-2);
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* ------------------------------------------------------------------ empty */
.ml-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 34px 20px 20px;
  color: var(--ml-ink-2);
}

.ml-empty .ml-empty-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, var(--ml-surface-2), var(--ml-paper));
  border: 1px solid var(--ml-line);
  color: var(--ml-amber-deep);
  box-shadow: var(--ml-shadow-sm);
}

.ml-empty .ml-empty-icon svg {
  width: 22px;
  height: 22px;
}

.ml-empty .ml-empty-title {
  font-size: 13px;
  font-weight: 650;
  color: var(--ml-ink);
}

.ml-empty .ml-empty-desc {
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--ml-ink-3);
  max-width: 260px;
}

.ml-empty .ml-empty-actions {
  margin-top: 4px;
  display: flex;
  gap: 6px;
}

/* --------------------------------------------------------------- overlays */
.ml-hl-layer {
  position: absolute;
  pointer-events: none;
  z-index: 3;
}

.ml-hl-rect {
  position: absolute;
  border-radius: 2px;
  background: rgba(251, 191, 36, 0.32);
  box-shadow: inset 0 0 0 1px rgba(224, 163, 11, 0.45);
  animation: ml-hl-in 0.16s var(--ml-ease);
  mix-blend-mode: multiply;
}

:root[data-color-scheme="dark"] .ml-hl-rect {
  background: rgba(247, 201, 72, 0.30);
  mix-blend-mode: screen;
}

/* The paragraph a hovered translation came from: context, not emphasis. */
.ml-hl-rect.ml-hl-para {
  background: rgba(251, 191, 36, 0.07);
  box-shadow: inset 0 0 0 1px rgba(224, 163, 11, 0.16);
  animation: none;
}

:root[data-color-scheme="dark"] .ml-hl-rect.ml-hl-para {
  background: rgba(247, 201, 72, 0.07);
  box-shadow: inset 0 0 0 1px rgba(247, 201, 72, 0.18);
}

@keyframes ml-hl-in {
  from { opacity: 0; transform: scaleY(0.7); }
  to { opacity: 1; transform: none; }
}

.ml-toast-wrap {
  position: fixed;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  z-index: 120;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  pointer-events: none;
}

.ml-toast {
  display: flex;
  align-items: center;
  gap: 7px;
  max-width: 460px;
  padding: 8px 13px;
  border-radius: 10px;
  background: rgba(30, 30, 36, 0.94);
  color: #f5f5f7;
  font-family: var(--ml-font);
  font-size: 11.5px;
  line-height: 1.45;
  box-shadow: var(--ml-shadow-pop);
  backdrop-filter: blur(12px);
  animation: ml-toast-in 0.22s var(--ml-ease);
}

.ml-toast.ml-error {
  background: rgba(122, 38, 38, 0.96);
}

.ml-toast.ml-success {
  background: rgba(26, 92, 56, 0.96);
}

.ml-toast.ml-leaving {
  animation: ml-toast-out 0.18s ease-in forwards;
}

.ml-toast svg {
  width: 13px;
  height: 13px;
  flex: none;
}

@keyframes ml-toast-in {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

@keyframes ml-toast-out {
  to { opacity: 0; transform: translateY(6px); }
}

/* ------------------------------------------------------------- selection */
.ml-selection-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 0;
}

.ml-selection-result {
  font-size: 11px;
  line-height: 1.55;
  color: var(--ml-ink-2);
  max-width: 420px;
}

@media (prefers-reduced-motion: reduce) {
  .ml-dock, .ml-popover, .ml-view, .ml-hl-rect, .ml-toast {
    animation: none !important;
    transition: none !important;
  }
}
`;

	/** Minimal stylesheet for the pdf frame, which hosts the highlight overlay. */
	const OVERLAY_CSS = `
.ml-hl-layer {
  position: absolute;
  pointer-events: none;
  z-index: 3;
}

.ml-hl-rect {
  position: absolute;
  border-radius: 2px;
  background: rgba(251, 191, 36, 0.34);
  box-shadow: inset 0 0 0 1px rgba(224, 163, 11, 0.5);
  mix-blend-mode: multiply;
  transition: opacity 0.12s ease;
}

@media (prefers-color-scheme: dark) {
  .ml-hl-rect {
    background: rgba(247, 201, 72, 0.32);
    mix-blend-mode: screen;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ml-hl-rect {
    transition: none;
  }
}
`;

	const OVERLAY_STYLE_ID = 'moonlit-overlay-styles';

	function injectOverlay(doc) {
		if (!doc || doc.getElementById(OVERLAY_STYLE_ID)) {
			return;
		}
		const style = doc.createElement('style');
		style.id = OVERLAY_STYLE_ID;
		style.textContent = OVERLAY_CSS;
		(doc.head || doc.documentElement).appendChild(style);
	}

	M.Styles = {
		injectOverlay,
		CSS,
		STYLE_ID: 'moonlit-reader-styles',
		/** Inject the stylesheet into a reader document (idempotent). */
		inject(doc) {
			if (!doc || doc.getElementById(this.STYLE_ID)) {
				return;
			}
			const style = doc.createElement('style');
			style.id = this.STYLE_ID;
			style.textContent = CSS;
			const target = doc.head || doc.documentElement;
			target.appendChild(style);
		},
		remove(doc) {
			doc?.getElementById?.(this.STYLE_ID)?.remove();
		}
	};
})();
