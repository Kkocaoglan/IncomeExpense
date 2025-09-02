export function parsePaging(req, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit || String(defaultLimit), 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

export function parseSort(req, defaults = { date: 'desc' }) {
  const raw = (req.query.sort || '').toString().trim();
  if (!raw) return defaults;
  const [field, dir] = raw.split(':');
  if (!field) return defaults;
  return { [field]: dir === 'asc' ? 'asc' : 'desc' };
}


