/**
 * validate_model and apply_change tools.
 *
 * validate_model runs the innfo-core validator against the resolved template.
 * apply_change performs intent-level operations on a model and re-validates.
 * On validation failure, the file is NOT written (reject-without-writing).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  parseModel,
  serializeModel,
  validateModel as coreValidate,
  getTemplate as coreGetTemplate,
  resolveSpecVersionFromFilename,
} from '@innv0/innfo-core';
import type { ParsedModel, ValidationResult } from '@innv0/innfo-core';

import { getTemplate } from './spec.js';

/* ── Types ───────────────────────────────────────────────────── */

export interface ApplyChangeResult {
  success: boolean;
  model?: ParsedModel;
  errors?: Array<{ path: string; message: string }>;
  warnings?: Array<{ path: string; message: string }>;
}

/* ── Core logic ──────────────────────────────────────────────── */

/**
 * Find a model file by id.
 * Tries exact path, then appending _NN.md.
 */
async function findModelFile(rootDir: string, id: string): Promise<string | null> {
  const candidates = [
    join(rootDir, id),
    join(rootDir, `${id}_NN.md`),
  ];
  for (const fp of candidates) {
    try {
      const { stat } = await import('node:fs/promises');
      await stat(fp);
      return fp;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Load a model: read + parse.
 */
async function loadModel(filePath: string): Promise<ParsedModel> {
  const content = await readFile(filePath, 'utf-8');
  return parseModel(content);
}

/**
 * Save a model: serialize + write.
 */
async function saveModel(filePath: string, model: ParsedModel): Promise<void> {
  const content = serializeModel(model);
  await writeFile(filePath, content, 'utf-8');
}

/* ── validate_model ──────────────────────────────────────────── */

/**
 * Validate a model against its template.
 * Provide either `id` (reads from disk) or `content` (inline raw text).
 */
export async function validateModel(
  rootDir: string,
  id?: string,
  content?: string,
): Promise<{ valid: boolean; errors: Array<{ path: string; message: string }>; warnings: Array<{ path: string; message: string }> }> {
  let model: ParsedModel;
  let modelVersion: string | null = null;

  if (content) {
    model = parseModel(content);
    modelVersion = model.frontmatter.model_version ?? null;
  } else if (id) {
    const filePath = await findModelFile(rootDir, id);
    if (!filePath) {
      return { valid: false, errors: [{ path: '', message: `Model not found: ${id}` }], warnings: [] };
    }
    model = await loadModel(filePath);
    modelVersion = resolveSpecVersionFromFilename(id);
    if (!modelVersion) {
      modelVersion = model.frontmatter.model_version ?? null;
    }
  } else {
    return { valid: false, errors: [{ path: '', message: 'Provide either id or content' }], warnings: [] };
  }

  // Resolve template from the parent_spec reference
  let template = null;
  if (model.frontmatter.parent_spec?.name) {
    const parentName = model.frontmatter.parent_spec.name;
    // Extract template name from parent spec name (e.g. business_V_0-1-1 → business)
    const templateName = parentName.split('_V_')[0] ?? parentName;
    template = await getTemplate(rootDir, templateName, modelVersion ?? undefined);
  }

  const formatSpec = null; // Level-1 spec not needed for model validation
  const result = coreValidate(model, template, formatSpec);

  // Map ValidationResult to our simpler shape
  return {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
  };
}

/* ── apply_change ────────────────────────────────────────────── */

// Intent operations

interface AddConceptArgs {
  conceptName: string;
  icon?: string;
  type?: string;
  color?: string;
}

interface AddFieldArgs {
  conceptName: string;
  fieldName: string;
  fieldType?: string;
  options?: string[];
}

interface SetMarkerArgs {
  markerName: string;
  symbol?: string;
  icon?: string;
  color?: string;
}

interface AddElementArgs {
  conceptName: string;
  elementName: string;
  description?: string;
  fields?: Record<string, unknown>;
}

interface RemoveElementArgs {
  conceptName: string;
  elementName: string;
}

type OpArgs = AddConceptArgs | AddFieldArgs | SetMarkerArgs | AddElementArgs | RemoveElementArgs;

/**
 * Apply an intent-level change to a model.
 * Semantics: parse → mutate → serialize → validate.
 * On failure: reject-without-writing (file unchanged, errors returned).
 */
export async function applyChange(
  rootDir: string,
  id: string,
  op: string,
  args: Record<string, unknown>,
): Promise<ApplyChangeResult> {
  const filePath = await findModelFile(rootDir, id);
  if (!filePath) {
    return { success: false, errors: [{ path: '', message: `Model not found: ${id}` }] };
  }

  let model: ParsedModel;
  try {
    model = await loadModel(filePath);
  } catch (err) {
    return { success: false, errors: [{ path: '', message: `Failed to load model: ${err}` }] };
  }

  // Apply the mutation
  try {
    applyMutation(model, op, args as unknown as OpArgs);
  } catch (err) {
    return { success: false, errors: [{ path: '', message: `Operation failed: ${err}` }] };
  }

  // Validate after mutation
  const modelVersion = resolveSpecVersionFromFilename(id) ?? model.frontmatter.model_version ?? undefined;
  let template = null;
  if (model.frontmatter.parent_spec?.name) {
    const parentName = model.frontmatter.parent_spec.name;
    const templateName = parentName.split('_V_')[0] ?? parentName;
    template = await getTemplate(rootDir, templateName, modelVersion);
  }

  const validationResult = coreValidate(model, template, null);

  if (!validationResult.valid) {
    // Reject without writing
    return {
      success: false,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
    };
  }

  // Write updated model
  try {
    await saveModel(filePath, model);
  } catch (err) {
    return { success: false, errors: [{ path: '', message: `Failed to write model: ${err}` }] };
  }

  return {
    success: true,
    model,
    warnings: validationResult.warnings,
  };
}

/* ── Mutation implementations ───────────────────────────────── */

function applyMutation(model: ParsedModel, op: string, args: OpArgs): void {
  switch (op) {
    case 'add_concept': {
      const a = args as AddConceptArgs;
      if (!a.conceptName) throw new Error('conceptName is required');
      const concepts = model.frontmatter.concepts ?? [];
      if (concepts.some(c => c.name.toLowerCase() === a.conceptName.toLowerCase())) {
        throw new Error(`Concept "${a.conceptName}" already exists`);
      }
      concepts.push({
        name: a.conceptName,
        icon: a.icon,
        type: (a.type ?? 'text') as any,
        color: a.color,
      });
      model.frontmatter.concepts = concepts;
      break;
    }

    case 'add_field': {
      const a = args as AddFieldArgs;
      if (!a.conceptName || !a.fieldName) throw new Error('conceptName and fieldName are required');
      const concepts = model.frontmatter.concepts ?? [];
      const concept = concepts.find(c => c.name.toLowerCase() === a.conceptName.toLowerCase());
      if (!concept) throw new Error(`Concept "${a.conceptName}" not found`);
      const fields = concept.fields ?? [];
      if (fields.some(f => f.name.toLowerCase() === a.fieldName.toLowerCase())) {
        throw new Error(`Field "${a.fieldName}" already exists on concept "${a.conceptName}"`);
      }
      fields.push({
        name: a.fieldName,
        type: (a.fieldType ?? 'string') as any,
        options: a.options,
      });
      concept.fields = fields;
      break;
    }

    case 'set_marker': {
      const a = args as SetMarkerArgs;
      if (!a.markerName) throw new Error('markerName is required');
      const markers = model.frontmatter.markers ?? [];
      const existing = markers.find(m => m.name.toLowerCase() === a.markerName.toLowerCase());
      if (existing) {
        if (a.symbol !== undefined) existing.symbol = a.symbol;
        if (a.icon !== undefined) existing.icon = a.icon;
        if (a.color !== undefined) existing.color = a.color;
      } else {
        markers.push({
          name: a.markerName,
          symbol: a.symbol,
          icon: a.icon,
          color: a.color,
        });
      }
      model.frontmatter.markers = markers;
      break;
    }

    case 'add_element': {
      const a = args as AddElementArgs;
      if (!a.conceptName || !a.elementName) throw new Error('conceptName and elementName are required');

      const existingElements = model.elements.get(a.conceptName) ?? [];
      if (existingElements.some(e => e.name.toLowerCase() === a.elementName.toLowerCase())) {
        throw new Error(`Element "${a.elementName}" already exists in concept "${a.conceptName}"`);
      }

      const newElement = {
        type: a.conceptName,
        name: a.elementName,
        description: a.description ?? '',
        fields: (a.fields ?? {}) as Record<string, unknown>,
        markers: {} as Record<string, number | string>,
      };

      existingElements.push(newElement);
      model.elements.set(a.conceptName, existingElements);
      break;
    }

    case 'remove_element': {
      const a = args as RemoveElementArgs;
      if (!a.conceptName || !a.elementName) throw new Error('conceptName and elementName are required');

      const existingElements = model.elements.get(a.conceptName) ?? [];
      const filtered = existingElements.filter(e => e.name.toLowerCase() !== a.elementName.toLowerCase());
      if (filtered.length === existingElements.length) {
        throw new Error(`Element "${a.elementName}" not found in concept "${a.conceptName}"`);
      }
      model.elements.set(a.conceptName, filtered);
      break;
    }

    default:
      throw new Error(`Unknown operation: ${op}`);
  }
}
