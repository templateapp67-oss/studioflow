export async function ensureTemplate12Seeded(workspace?: any): Promise<void> {
  // Seed initial data if needed
  return Promise.resolve();
}

export async function syncIronInkWorkspace(workspace: any): Promise<void> {
  const categories = (workspace?.categories || []).map((category: any) => ({
    name: category.name,
    duration_label:category.duration,
    starting_price: category.price,
    description: category.description,
  }));
  return Promise.resolve();
}

export async function uploadInkReference(file: File): Promise<string> {
  return Promise.resolve('https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80');
}
