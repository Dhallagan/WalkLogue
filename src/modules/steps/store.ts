const memoryStore = new Map<string, string>();

type SecureStoreModule = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export async function getStoredValue(key: string) {
  const store = await loadSecureStore();

  if (!store) {
    return memoryStore.get(key) ?? null;
  }

  return store.getItemAsync(key);
}

export async function setStoredValue(key: string, value: string) {
  const store = await loadSecureStore();

  if (!store) {
    memoryStore.set(key, value);
    return;
  }

  await store.setItemAsync(key, value);
}

export async function deleteStoredValue(key: string) {
  const store = await loadSecureStore();

  if (!store) {
    memoryStore.delete(key);
    return;
  }

  await store.deleteItemAsync(key);
}

async function loadSecureStore(): Promise<SecureStoreModule | null> {
  try {
    const module = await import("expo-secure-store");
    return module;
  } catch {
    return null;
  }
}
