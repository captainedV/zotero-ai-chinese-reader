/* eslint-disable no-unused-vars */
// Default preference values for Moonlit Reader.
// Loaded by Zotero into the default branch, so values only apply until the user
// changes them. Only string / number / boolean values are supported here.
pref("extensions.zotero.moonlit.provider", "deepseek");
pref("extensions.zotero.moonlit.baseURL", "");
pref("extensions.zotero.moonlit.model", "");
pref("extensions.zotero.moonlit.apiKey", "");
pref("extensions.zotero.moonlit.temperature", "0.3");
pref("extensions.zotero.moonlit.maxTokens", 8192);
// Bail out of a stalled stream and retry without streaming.
pref("extensions.zotero.moonlit.stallSeconds", 15);
pref("extensions.zotero.moonlit.concurrency", 3);
// fetch (1.0.1 behaviour) or xhr; the plugin falls back to xhr when fetch is missing.
pref("extensions.zotero.moonlit.transport", "fetch");
// Requests per minute; stay under the gateway limit (0 disables the budget).
pref("extensions.zotero.moonlit.maxRpm", 45);
pref("extensions.zotero.moonlit.stream", true);
pref("extensions.zotero.moonlit.timeoutSeconds", 120);
pref("extensions.zotero.moonlit.targetLang", "zh-CN");

pref("extensions.zotero.moonlit.enableTranslate", false);
pref("extensions.zotero.moonlit.enableSummary", false);
pref("extensions.zotero.moonlit.enableHighlight", false);
pref("extensions.zotero.moonlit.granularity", "paragraph");
pref("extensions.zotero.moonlit.dockWidth", 430);
pref("extensions.zotero.moonlit.dockTab", "summary");
pref("extensions.zotero.moonlit.showOriginalInTranslation", true);
pref("extensions.zotero.moonlit.followPdf", true);
pref("extensions.zotero.moonlit.autoTranslateOnOpen", false);

pref("extensions.zotero.moonlit.promptTranslate", "");
pref("extensions.zotero.moonlit.promptSummary", "");
pref("extensions.zotero.moonlit.promptHighlight", "");

pref("extensions.zotero.moonlit.debug", false);
pref("extensions.zotero.moonlit.autoSelfTest", false);
pref("extensions.zotero.moonlit.selfTestPDF", "");
pref("extensions.zotero.moonlit.devCheckDir", "");
pref("extensions.zotero.moonlit.selfTestProvider", "mock");
pref("extensions.zotero.moonlit.extractMaxPages", 0);
