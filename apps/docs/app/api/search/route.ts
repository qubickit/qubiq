import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const { GET } = createFromSource(source, {
  // Reference: docs.orama.com (supported languages)
  language: 'english',
});
