const DREAMLO_BASE = 'http://dreamlo.com/lb';
const DREAMLO_KEY = 'Zk9lKzzIkkW5L3fFVzTysQpEM0ihJEWki9toMiUZwoVg';

const TIMEZONE_TO_FLAG = {
    'Australia': '\u{1F1E6}\u{1F1FA}',
    'Pacific/Auckland': '\u{1F1F3}\u{1F1FF}',
    'Pacific/Fiji': '\u{1F1EB}\u{1F1EF}',
    'Asia/Tokyo': '\u{1F1EF}\u{1F1F5}',
    'Asia/Seoul': '\u{1F1F0}\u{1F1F7}',
    'Asia/Shanghai': '\u{1F1E8}\u{1F1F3}',
    'Asia/Chongqing': '\u{1F1E8}\u{1F1F3}',
    'Asia/Hong_Kong': '\u{1F1ED}\u{1F1F0}',
    'Asia/Taipei': '\u{1F1F9}\u{1F1FC}',
    'Asia/Singapore': '\u{1F1F8}\u{1F1EC}',
    'Asia/Kolkata': '\u{1F1EE}\u{1F1F3}',
    'Asia/Calcutta': '\u{1F1EE}\u{1F1F3}',
    'Asia/Dubai': '\u{1F1E6}\u{1F1EA}',
    'Asia/Bangkok': '\u{1F1F9}\u{1F1ED}',
    'Asia/Jakarta': '\u{1F1EE}\u{1F1E9}',
    'Asia/Manila': '\u{1F1F5}\u{1F1ED}',
    'Asia/Kuala_Lumpur': '\u{1F1F2}\u{1F1FE}',
    'Europe/London': '\u{1F1EC}\u{1F1E7}',
    'Europe/Paris': '\u{1F1EB}\u{1F1F7}',
    'Europe/Berlin': '\u{1F1E9}\u{1F1EA}',
    'Europe/Rome': '\u{1F1EE}\u{1F1F9}',
    'Europe/Madrid': '\u{1F1EA}\u{1F1F8}',
    'Europe/Amsterdam': '\u{1F1F3}\u{1F1F1}',
    'Europe/Brussels': '\u{1F1E7}\u{1F1EA}',
    'Europe/Zurich': '\u{1F1E8}\u{1F1ED}',
    'Europe/Vienna': '\u{1F1E6}\u{1F1F9}',
    'Europe/Stockholm': '\u{1F1F8}\u{1F1EA}',
    'Europe/Oslo': '\u{1F1F3}\u{1F1F4}',
    'Europe/Copenhagen': '\u{1F1E9}\u{1F1F0}',
    'Europe/Helsinki': '\u{1F1EB}\u{1F1EE}',
    'Europe/Dublin': '\u{1F1EE}\u{1F1EA}',
    'Europe/Lisbon': '\u{1F1F5}\u{1F1F9}',
    'Europe/Warsaw': '\u{1F1F5}\u{1F1F1}',
    'Europe/Moscow': '\u{1F1F7}\u{1F1FA}',
    'Europe/Istanbul': '\u{1F1F9}\u{1F1F7}',
    'America/New_York': '\u{1F1FA}\u{1F1F8}',
    'America/Chicago': '\u{1F1FA}\u{1F1F8}',
    'America/Denver': '\u{1F1FA}\u{1F1F8}',
    'America/Los_Angeles': '\u{1F1FA}\u{1F1F8}',
    'America/Phoenix': '\u{1F1FA}\u{1F1F8}',
    'America/Anchorage': '\u{1F1FA}\u{1F1F8}',
    'America/Toronto': '\u{1F1E8}\u{1F1E6}',
    'America/Vancouver': '\u{1F1E8}\u{1F1E6}',
    'America/Mexico_City': '\u{1F1F2}\u{1F1FD}',
    'America/Sao_Paulo': '\u{1F1E7}\u{1F1F7}',
    'America/Argentina': '\u{1F1E6}\u{1F1F7}',
    'America/Santiago': '\u{1F1E8}\u{1F1F1}',
    'America/Bogota': '\u{1F1E8}\u{1F1F4}',
    'America/Lima': '\u{1F1F5}\u{1F1EA}',
    'Africa/Cairo': '\u{1F1EA}\u{1F1EC}',
    'Africa/Lagos': '\u{1F1F3}\u{1F1EC}',
    'Africa/Johannesburg': '\u{1F1FF}\u{1F1E6}',
    'Africa/Nairobi': '\u{1F1F0}\u{1F1EA}',
};

export function getCountryFlag() {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Try exact match first
        if (TIMEZONE_TO_FLAG[tz]) return TIMEZONE_TO_FLAG[tz];
        // Try prefix match (e.g. "Australia/Sydney" → "Australia")
        for (const [key, flag] of Object.entries(TIMEZONE_TO_FLAG)) {
            if (tz.startsWith(key)) return flag;
        }
    } catch (e) { /* ignore */ }
    return '\u{1F30D}'; // globe fallback
}

export async function submitScore(name, score, flag) {
    const safeName = encodeURIComponent(name.replace(/[|/\\]/g, ''));
    const url = `${DREAMLO_BASE}/${DREAMLO_KEY}/add/${safeName}/${score}/0/${encodeURIComponent(flag)}`;
    await fetch(url);
}

export async function getTopScores(limit = 10) {
    const url = `${DREAMLO_BASE}/${DREAMLO_KEY}/json/${limit}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const lb = data?.dreamlo?.leaderboard;
        if (!lb || !lb.entry) return [];
        // Single entry comes as object, multiple as array
        const entries = Array.isArray(lb.entry) ? lb.entry : [lb.entry];
        return entries.map((e, i) => ({
            rank: i + 1,
            name: e.name,
            score: e.score,
            flag: e.text || '\u{1F30D}',
        }));
    } catch (e) {
        console.warn('Leaderboard fetch failed:', e);
        return [];
    }
}

const STORAGE_KEY = 'snorkel_recent_names';

export function getRecentNames() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
}

export function saveRecentName(name) {
    const names = getRecentNames().filter(n => n !== name);
    names.unshift(name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names.slice(0, 5)));
}
