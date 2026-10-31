export function requestedTemplate(search: string) {
  const query = new URLSearchParams(search);
  const id = query.get('template');
  if (!id) return null;
  return { id };
}
