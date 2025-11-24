// Highlighting functions for Info-Audit extension
// This file contains the sophisticated highlighting logic from the example code

// Inject highlight style and load mark.js
const style = document.createElement('style');
style.textContent = `
.wi-highlight, mark.wi-highlight {
    background: yellow;
    padding: 0 0.1em;
    border-radius: 2px;
}`;
document.head.append(style);

if (!window.Mark) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mark.js/dist/mark.min.js';
    document.head.append(script);
}

// Clear all highlights
export function clearHighlights() {
    document.querySelectorAll('#chat .mes .mes_text, #chat .mes').forEach(mesEl => {
        if (window.Mark) {
            const instance = new window.Mark(mesEl);
            instance.unmark({ className: 'wi-highlight' });
        } else {
            mesEl.querySelectorAll('mark.wi-highlight').forEach(mark => {
                const parent = mark.parentNode;
                if (parent) parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
            });
        }
    });
}

// Highlight all keywords in messages for a specific entry
export function highlightAllKeywordsInMessages(entry, options = {}) {
    if (!entry || !entry._uniqueKeywords?.length) return;
    const keywords = entry._uniqueKeywords;
    
    // Get chat and metadata from options or use defaults
    const chat = options.chat || (typeof window !== 'undefined' ? window.chat : []);
    const chat_metadata = options.chatMeta || (typeof window !== 'undefined' ? window.chat_metadata : {});
    const metadata_keys = { depth: 'depth' };

    setTimeout(() => {
        // Resolve depth dynamically
        const resolvedDepth = (typeof globalThis !== 'undefined' && (typeof globalThis.worldInfoDepth === 'number' || typeof globalThis.world_info_depth === 'number'))
            ? (globalThis.worldInfoDepth ?? globalThis.world_info_depth)
            : (chat_metadata[metadata_keys.depth] ?? 4);
        const startIndex = Math.max(0, chat.length - resolvedDepth);

        for (let i = startIndex; i < chat.length; i++) {
            const mesEl = document.querySelector(`#chat .mes[mesid="${i}"] .mes_text`) || document.querySelector(`#chat .mes[mesid="${i}"]`);
            if (mesEl && window.Mark) {
                const instance = new window.Mark(mesEl);
                keywords.forEach(keyword => {
                    const escaped = keyword.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
                    instance.markRegExp(pattern, { className: 'wi-highlight' });
                });
            }
        }
    }, 50);
}

// Find triggering keywords in chat messages
export function findTriggeringKeywords(entry, options = {}) {
    // Get chat and metadata from options or use defaults
    const chat = options.chat || (typeof window !== 'undefined' ? window.chat : []);
    const chat_metadata = options.chatMeta || (typeof window !== 'undefined' ? window.chat_metadata : {});
    const metadata_keys = { depth: 'depth' };

    // Resolve depth dynamically
    const resolvedDepth = (typeof globalThis !== 'undefined' && (typeof globalThis.worldInfoDepth === 'number' || typeof globalThis.world_info_depth === 'number'))
        ? (globalThis.worldInfoDepth ?? globalThis.world_info_depth)
        : (chat_metadata[metadata_keys.depth] ?? 4);

    const startIndex = Math.max(0, chat.length - resolvedDepth);
    const keywords = entry.key.filter(it => it.trim().length > 0);
    const foundKeywords = [];
    const locations = [];

    for (let i = startIndex; i < chat.length; i++) {
        const mes = chat[i].mes ?? '';
        for (const keyword of keywords) {
            const escaped = keyword.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
            let m;
            while ((m = pattern.exec(mes)) !== null) {
                if (!foundKeywords.includes(keyword)) foundKeywords.push(keyword);
                locations.push({ mesId: i, keyword, start: m.index, end: m.index + m[0].length });
            }
        }
    }

    entry.triggerLocations = locations;
    entry._uniqueKeywords = foundKeywords;
    entry._keywordFirstLocation = {};
    for (const loc of locations) {
        if (!entry._keywordFirstLocation[loc.keyword]) entry._keywordFirstLocation[loc.keyword] = loc;
    }

    return foundKeywords;
}
