export function createServiceImageVariation(): string {
  return `var-${Math.floor(Math.random() * 10000)}`;
}

export function serviceImagePrompt(name: string, category: string, description: string, variationSeed?: string): string {
  const serviceName = name || 'Salon Service';
  const categoryName = category || 'Beauty';
  const desc = description ? ` (${description})` : '';
  return `Create a high-resolution professional studio photography asset for a luxury ${categoryName} salon service: "${serviceName}"${desc}. Bright, ultra-clean aesthetic, editorial studio lighting, highly detailed focus. Seed: ${variationSeed || 'v1'}`;
}
