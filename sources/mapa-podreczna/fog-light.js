// Fog Light: samodzielna adaptacja logiki Maddonz (Barlag).
// Źródło: KoniecDniaDziecka/test, margonem-sources/maddonz.original.js, FogLight.
function createFogLight(PAGE, enabled, deleteNpcs) {
    const remembered = new Set();
    let mapId, purging = false;
    const map = () => PAGE.Engine?.map?.d || {};
    const npc = id => PAGE.Engine?.npcs?.getById?.(id)?.d || PAGE.Engine?.npcs?.check?.()?.[id]?.d;
    const monster = data => data && [2, 3].includes(Number(data.type));
    const idOf = entry => String(entry && typeof entry === 'object' ? entry.id : entry);
    function syncMap() {
        const id = map().id;
        if (mapId !== undefined && String(id) !== String(mapId)) remembered.clear();
        mapId = id;
    }
    function visible(data) {
        const range = Number(map().visibility), hero = PAGE.Engine?.hero?.d;
        // Without complete visibility data, keep the game's deletion behavior.
        if (!Number.isFinite(range) || range < 0 || !Number.isFinite(Number(hero?.x)) || !Number.isFinite(Number(hero?.y)) ||
            !Number.isFinite(Number(data.x)) || !Number.isFinite(Number(data.y))) return true;
        return Math.abs(hero.x - data.x) <= range && Math.abs(hero.y - data.y) <= range;
    }
    function purge(ids) {
        if (!ids.length) return;
        purging = true;
        try { deleteNpcs(ids); } finally { purging = false; }
    }
    function clear() {
        syncMap();
        const ids = [...remembered];
        remembered.clear();
        purge(ids);
    }
    function before(packet) {
        syncMap();
        if (!packet || typeof packet !== 'object') return packet;
        if (packet.town) { remembered.clear(); return packet; }
        if (!enabled() || purging || Number(map().pvp) !== 2 || !Array.isArray(packet.npcs_del)) return packet;
        const deletions = packet.npcs_del.filter(entry => {
            const id = idOf(entry), data = npc(id);
            if (!id.startsWith('echo') && monster(data) && !visible(data)) {
                remembered.add(id);
                return false;
            }
            remembered.delete(id);
            return true;
        });
        return deletions.length === packet.npcs_del.length ? packet : { ...packet, npcs_del: deletions };
    }
    function after(packet) {
        syncMap();
        if (purging || !enabled() || (packet?.h?.x == null && packet?.h?.y == null)) return;
        const updates = Array.isArray(packet.npcs) ? packet.npcs : Object.entries(packet.npcs || {})
            .filter(([, data]) => data && typeof data === 'object').map(([id, data]) => ({ ...data, id: data.id ?? id }));
        const refreshed = new Set(updates.filter(data => !data.del).map(idOf));
        const remove = [];
        for (const id of remembered) {
            const data = npc(id);
            if (!data || (monster(data) && visible(data))) {
                if (!refreshed.has(id)) remove.push(id);
                remembered.delete(id);
            }
        }
        purge(remove);
    }
    return { before, after, clear, syncMap };
}
