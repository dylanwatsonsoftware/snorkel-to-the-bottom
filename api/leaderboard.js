const DREAMLO_BASE = 'http://dreamlo.com/lb';
const DREAMLO_KEY = 'Zk9lKzzIkkW5L3fFVzTysQpEM0ihJEWki9toMiUZwoVg';

export default async function handler(req, res) {
    const { action } = req.query;

    let url;
    if (action === 'get') {
        const limit = parseInt(req.query.limit) || 10;
        url = `${DREAMLO_BASE}/${DREAMLO_KEY}/json/${limit}`;
    } else if (action === 'add') {
        const { name, score, flag } = req.query;
        if (!name || !score) {
            return res.status(400).json({ error: 'name and score required' });
        }
        const safeName = name.replace(/[|/\\]/g, '').slice(0, 15);
        url = `${DREAMLO_BASE}/${DREAMLO_KEY}/add/${encodeURIComponent(safeName)}/${score}/0/${encodeURIComponent(flag || '')}`;
    } else {
        return res.status(400).json({ error: 'action must be "get" or "add"' });
    }

    try {
        const response = await fetch(url);
        const text = await response.text();

        if (action === 'get') {
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(text);
        } else {
            res.status(200).json({ ok: true });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
