import {
  FileText,
  Folder,
  Scale,
  ListChecks,
  GitCommit,
  HelpCircle
} from 'lucide-vue-next';
import type { Component } from 'vue';

export type ConceptType = 'text' | 'category' | 'weight' | 'steps' | 'sequence' | null | undefined | string;

/**
 * Maps a concept TYPE to its representative Lucide icon.
 * This is the visual language of the "mold" — what kind of thing a concept is,
 * independent of any specific instance.
 */
export const getConceptTypeIcon = (type: ConceptType): Component => {
  switch (type) {
    case 'text':
      return FileText;
    case 'category':
      return Folder;
    case 'weight':
      return Scale;
    case 'steps':
      return ListChecks;
    case 'sequence':
      return GitCommit;
    default:
      return HelpCircle;
  }
};

/**
 * Semantic kind of a pill/block:
 * - `concept`  → the instantiable definition (a mold). Rendered as an outline.
 * - `instance` → a concrete block created from a concept. Rendered as a solid fill.
 */
export type BlockKind = 'concept' | 'instance';
