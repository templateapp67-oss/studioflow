export async function loadTemplateCatalogue<T>(options: {
  load: () => Promise<{ data: any[] | null; error: any }>;
  fallback: T[];
  upgrade?: (config: any) => T;
}): Promise<{ templates: T[] }> {
  try {
    const { data, error } = await options.load();
    if (error || !data || data.length === 0) {
      return { templates: options.fallback };
    }
    const templates = data.map(item => {
      const cfg = item.config || item;
      return options.upgrade ? options.upgrade(cfg) : (cfg as T);
    });
    return { templates };
  } catch {
    return { templates: options.fallback };
  }
}
