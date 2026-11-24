const storageKey = 'modo-lenda-commerce-v1';
const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatPrice(value) {
  return reais.format(value);
}

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function createFavorites(storage = browserStorage()) {
  let local = [];

  function get() {
    try {
      const value = storage ? JSON.parse(storage.getItem(storageKey)) : null;
      if (!storage) return [...local];
      if (!Array.isArray(value?.favorites)) return [];
      return [...new Set(value.favorites.filter(id => typeof id === 'string' && id.length > 0))];
    } catch {
      return [...local];
    }
  }

  function has(id) {
    return get().includes(id);
  }

  function toggle(id) {
    if (typeof id !== 'string' || !id) return false;
    const previous = get();
    const exists = previous.includes(id);
    local = exists ? previous.filter(item => item !== id) : [...previous, id];
    try {
      storage?.setItem(storageKey, JSON.stringify({ favorites: local }));
    } catch {
      storage = null;
    }
    return !exists;
  }

  return { get, has, toggle };
}
