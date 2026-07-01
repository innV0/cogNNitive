import {
  ParsedModel, SpecDocument, ValidationResult, ValidationError,
  Concept, Marker, MatrixDecl, ElementNode, SpecFrontmatter, ElementsMap
} from './types';

export function validateModel(
  model: ParsedModel,
  template: SpecDocument | null,
  formatSpec: SpecDocument | null
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const fm = model.frontmatter;

  if (!fm.level) {
    errors.push({ path: 'frontmatter.level', message: 'Missing level', severity: 'error' });
  }
  if (fm.level !== 3) {
    errors.push({ path: 'frontmatter.level', message: `Expected level 3 for model, got ${fm.level}`, severity: 'error' });
  }
  if (!fm.parent) {
    errors.push({ path: 'frontmatter.parent', message: 'Missing parent', severity: 'error' });
  }
  if (!fm.model_version) {
    errors.push({ path: 'frontmatter.model_version', message: 'Missing model_version', severity: 'error' });
  }

  if (!template) {
    warnings.push({ path: 'parent', message: 'Template not resolved — skipping template validation', severity: 'warning' });
    return { valid: errors.length === 0, errors, warnings };
  }

  const templateFm = template.frontmatter;
  const templateConcepts = templateFm.concepts ?? [];
  const templateMarkers = templateFm.markers ?? [];
  const templateMatrices = templateFm.matrices ?? [];

  for (const [conceptName, elements] of model.elements) {
    const conceptDef = templateConcepts.find(c => c.name.toLowerCase() === conceptName.toLowerCase());
    if (!conceptDef) {
      errors.push({
        path: `elements.${conceptName}`,
        message: `Concept "${conceptName}" is not defined in template`,
        severity: 'error'
      });
      continue;
    }

    const conceptType = conceptDef.type;
    if ((conceptType === 'text') && elements.length > 1) {
      warnings.push({
        path: `elements.${conceptName}`,
        message: `Text-type concept "${conceptName}" should have at most 1 element, got ${elements.length}`,
        severity: 'warning'
      });
    }

    for (const el of elements) {
      if (conceptDef.fields && conceptDef.fields.length > 0) {
        for (const fieldDef of conceptDef.fields) {
          if (fieldDef.type === 'select' && fieldDef.options && el.fields[fieldDef.name]) {
            const val = String(el.fields[fieldDef.name]);
            if (!fieldDef.options.includes(val)) {
              errors.push({
                path: `elements.${conceptName}.${el.name}.fields.${fieldDef.name}`,
                message: `Invalid value "${val}" for field "${fieldDef.name}". Allowed: ${fieldDef.options.join(', ')}`,
                severity: 'error'
              });
            }
          }
        }
      }

      for (const [markerName] of Object.entries(el.markers)) {
        if (!templateMarkers.find(m => m.name === markerName)) {
          warnings.push({
            path: `elements.${conceptName}.${el.name}.markers.${markerName}`,
            message: `Marker "${markerName}" is not defined in template`,
            severity: 'warning'
          });
        }
      }
    }
  }

  for (const matrix of model.matrices) {
    const decl = templateMatrices.find(m => m.name.toLowerCase() === matrix.name.toLowerCase());
    if (!decl) {
      warnings.push({
        path: `matrices.${matrix.name}`,
        message: `Matrix "${matrix.name}" is not declared in template`,
        severity: 'warning'
      });
    }
  }

  for (const [itemName, markers] of Object.entries(model.nodeMarkers)) {
    for (const markerName of Object.keys(markers)) {
      if (!templateMarkers.find(m => m.name === markerName)) {
        warnings.push({
          path: `nodeMarkers.${itemName}.${markerName}`,
          message: `Marker "${markerName}" is not defined in template`,
          severity: 'warning'
        });
      }
    }
  }

  if (formatSpec) {
    const formatFm = formatSpec.frontmatter;
    if (formatFm.modes && Array.isArray(formatFm.modes) && !formatFm.modes.includes(fm.mode as any)) {
      errors.push({
        path: 'frontmatter.mode',
        message: `Mode "${fm.mode}" is not supported by FORMAT. Supported: ${formatFm.modes.join(', ')}`,
        severity: 'error'
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
