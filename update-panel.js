//update panel for info-audit extension

//escape html
function escapeHtml(s) {
    if (s == null) return '';
    s = String(s);
    return s.replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#39;');
}

//escape regexp string
function escapeForRegExp(s) {
    return String(s).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

//get context
const context = (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function')
    ? SillyTavern.getContext()
    : (typeof window !== 'undefined' ? window.SillyTavern?.getContext?.() : null);

//get event source and types
const eventSource = context?.eventSource ?? (typeof window !== 'undefined' ? window.eventSource : null);
const eventTypes = context?.eventTypes ?? (typeof window !== 'undefined' ? window.eventTypes : null);

//get chat and metadata
const getChat = () => {
    if (context?.chat) return context.chat;
    if (typeof window !== 'undefined' && window.chat) return window.chat;
    if (typeof globalThis !== 'undefined' && globalThis.chat) return globalThis.chat;
    return [];
};

const getChatMetadata = () => {
    if (context?.chat_metadata) return context.chat_metadata;
    if (typeof window !== 'undefined' && window.chat_metadata) return window.chat_metadata;
    if (typeof globalThis !== 'undefined' && globalThis.chat_metadata) return globalThis.chat_metadata;
    return {};
};

//find triggering keywords
export function findTriggeringKeywords(entry, options = {}) {
    try {
        if (!entry) return [];
        const chat = Array.isArray(options.chat) ? options.chat : getChat();
        const chatMeta = options.chatMeta ?? getChatMetadata();

        // Normalize depth: try global depth, else metadata depth, else default 4
        const resolvedDepth =
            (typeof globalThis !== 'undefined' && (typeof globalThis.worldInfoDepth === 'number' || typeof globalThis.world_info_depth === 'number'))
                ? (globalThis.worldInfoDepth ?? globalThis.world_info_depth)
                : (chatMeta?.depth ?? 4);
        const depth = Number.isFinite(resolvedDepth) ? Math.max(1, Math.floor(resolvedDepth)) : 4;

        const startIndex = Math.max(0, chat.length - depth);

        //normalize keywords array
        let keywords = [];
        if (Array.isArray(entry.key)) {
            keywords = entry.key.map(k => String(k).trim()).filter(k => k.length > 0);
        } else if (typeof entry.key === 'string') {
            keywords = entry.key.split(',').map(k => String(k).trim()).filter(k => k.length > 0);
        } else {
            keywords = [];
        }

        if (keywords.length === 0) {
            entry.triggerLocations = [];
            entry._uniqueKeywords = [];
            return [];
        }

        const foundKeywords = [];
        const locations = [];

        for (let i = startIndex; i < chat.length; i++) {
            const mesObj = chat[i] || {};
            // Possible message fields used by different hosts: mes, message, content, text
            const rawText = (mesObj.mes ?? mesObj.message ?? mesObj.content ?? mesObj.text ?? '');
            const messageText = String(rawText || '');

            if (!messageText.length) continue;

            for (const keyword of keywords) {
                // Build word-boundary aware regex; allow simple possessives/plurals to match loosely
                const esc = escapeForRegExp(keyword);
                const pattern = new RegExp(`(^|[^\\w])(${esc})((?:'s|s)?)(?!\\w)`, 'i');

                let m;
                while ((m = pattern.exec(messageText)) !== null) {
                    if (!foundKeywords.includes(keyword)) foundKeywords.push(keyword);
                    locations.push({
                        mesId: i,
                        keyword,
                        start: m.index + (m[1]?.length ?? 0),
                        end: (m.index + (m[1]?.length ?? 0)) + m[2].length
                    });
                    // Avoid infinite loops; advance search position
                    const nextStart = m.index + Math.max(1, m[0].length);
                    const rest = messageText.slice(nextStart);
                    if (!rest.length) break;
                    break;
                }
            }
        }

        entry.triggerLocations = locations;
        entry._uniqueKeywords = foundKeywords;
        return foundKeywords;
    } catch (err) {
        console.warn('[Info-Audit] findTriggeringKeywords error:', err);
        entry.triggerLocations = entry.triggerLocations || [];
        entry._uniqueKeywords = entry._uniqueKeywords || [];
        return entry._uniqueKeywords;
    }
}

//determine trigger reason
export function determineTriggerReason(entry) {
    if (!entry) return 'Unknown';
    if (entry.constant === true) return 'Constant';
    if (entry.vectorized === true) return 'Vectorized';
    // Check triggeringKeywords (or computed _uniqueKeywords)
    const kws = Array.isArray(entry.triggeringKeywords) ? entry.triggeringKeywords
        : Array.isArray(entry._uniqueKeywords) ? entry._uniqueKeywords
        : [];
    if (kws.length > 0) return 'Keywords';
    // Position might be numeric or string depending on host; tolerate both
    if (entry.position === 'ANTop') return "Author's Note";
    if (entry.position === 'ANBottom') return "Author's Note";
    if (String(entry.position) === 'atDepth' || String(entry.position).toLowerCase() === 'atdepth') return 'Inserted at depth';
    return 'Unknown';
}

//panel wiring
let currentTriggeredEntries = [];

export async function updatePanelContent() {
    try {
        const panel = document.getElementById('info-panel');
        if (!panel) return;

        const raw = currentTriggeredEntries || [];
        const sourceUsed = 'WORLD_INFO_ACTIVATED';

        if (!raw || raw.length === 0) {
            panel.innerHTML = `<div class="ia-empty">No triggered world-info entries for the last message.</div>`;
            console.info('[Info-Audit] No triggered entries. sourceUsed:', sourceUsed);
            return;
        }

        //compute triggered keywords & reasons for each entry
        const chat = getChat();
        const computed = raw.map(e => {
            try {
                const triggeringKeywords = findTriggeringKeywords(e, { chat });
                e.triggeringKeywords = Array.isArray(triggeringKeywords) ? triggeringKeywords : [];
                e.triggerReason = determineTriggerReason(e);
            } catch (err) {
                e.triggeringKeywords = e.triggeringKeywords || [];
                e.triggerReason = e.triggerReason || 'Unknown';
            }
            return e;
        });

        //group by world
        const grouped = {};
        for (const e of computed) {
            if (!e) continue;
            const world = e.world || e.source || 'Unknown World';
            const title = e.comment?.length ? e.comment : (Array.isArray(e.key) ? e.key.join(', ') : (e.name ?? e.key ?? 'Untitled'));
            const keywords = Array.isArray(e.triggeringKeywords) ? e.triggeringKeywords.map(k => String(k)) : [];
            grouped[world] = grouped[world] || [];
            grouped[world].push({ title, keywords, reason: e.triggerReason ?? 'Unknown' });
        }

        //render: world -> entries
        let html = `<div class="ia-source ia-source-hidden">Data source: ${escapeHtml(sourceUsed)}</div>`;
        for (const world of Object.keys(grouped)) {
            html += `<div class="ia-world">
                <div class="ia-world-header">${escapeHtml(world)}</div>
                <ul class="ia-entry-list">`;
            html += grouped[world].map(entry => {
                const keywordsStr = (entry.keywords && entry.keywords.length) ? escapeHtml(entry.keywords.join(', ')) : '';
                const tooltip = keywordsStr ? `Keywords: ${keywordsStr}` : '';
                const reasonPart = entry.reason ? (tooltip ? `\nReason: ${escapeHtml(entry.reason)}` : `Reason: ${escapeHtml(entry.reason)}`) : '';
                const titleAttr = tooltip ? `${tooltip}${reasonPart}` : reasonPart;
                return `<li class="ia-entry-item" title="${titleAttr}">${escapeHtml(entry.title)}</li>`;
            }).join('');
            html += `</ul></div>`;
        }

        panel.innerHTML = html;
        console.info('[Info-Audit] panel updated. source:', sourceUsed);
    } catch (err) {
        console.error('[Info-Audit] updatePanelContent crashed:', err);
    }
}

//listen for events
if (typeof SillyTavern !== 'undefined' && SillyTavern.onMessageGenerated) {
    // Use SillyTavern's event system
    SillyTavern.onMessageGenerated(updatePanelContent);
} else if (eventSource && eventTypes && eventTypes.WORLD_INFO_ACTIVATED) {
    eventSource.on(eventTypes.WORLD_INFO_ACTIVATED, (entries) => {
        try {
            currentTriggeredEntries = (Array.isArray(entries) ? entries : []).filter(e => e?.disable !== true);
            updatePanelContent();
        } catch (err) {
            console.error('[Info-Audit] WORLD_INFO_ACTIVATED handler crashed:', err);
        }
    });
} else if (eventSource && context?.eventTypes && context.eventTypes.WORLD_INFO_ACTIVATED) {
    //alternative naming
    eventSource.on(context.eventTypes.WORLD_INFO_ACTIVATED, (entries) => {
        currentTriggeredEntries = (Array.isArray(entries) ? entries : []).filter(e => e?.disable !== true);
        updatePanelContent();
    });
} else {
    // Fallback: no event wiring present
    console.warn('[Info-Audit] event wiring for WORLD_INFO_ACTIVATED not found — panel will update only when updatePanelContent() is called manually and currentTriggeredEntries is populated.');
    // Ensure panel is initialized with empty state if no entries are available
    setTimeout(() => {
        try {
            const panel = document.getElementById('info-panel');
            if (panel && !panel.innerHTML) {
                panel.innerHTML = `<div class="ia-empty">No triggered world-info entries for the last message.</div>`;
            }
        } catch (err) {
            console.warn('[Info-Audit] Failed to initialize panel:', err);
        }
    }, 1000);
}
