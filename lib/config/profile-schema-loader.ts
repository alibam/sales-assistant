/**
 * Profile Schema Loader
 * Loads and parses profile_schema.json at runtime.
 * Extracts required fields, field types, and validation rules.
 */
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ProfileSchema, SchemaFieldDef } from '../ai/types';

// ── Zod schemas for runtime validation of profile_schema.json ──

const schemaFieldDefSchema = z.object({
  type: z.string(),
  description: z.string(),
  enum: z.array(z.string()).optional(),
  items: z.object({ type: z.string() }).optional(),
}).passthrough();

const schemaSectionDefSchema = z.object({
  type: z.literal('object'),
  title: z.string(),
  properties: z.record(schemaFieldDefSchema),
  required: z.array(z.string()).optional(),
}).passthrough();

const profileSchemaValidator = z.object({
  $schema: z.string().optional(),
  title: z.string(),
  description: z.string(),
  type: z.string().optional(),
  properties: z.record(schemaSectionDefSchema),
  required: z.array(z.string()),
  additionalProperties: z.boolean().optional(),
  metadata: z.object({
    version: z.string(),
    industry: z.string(),
    locale: z.string(),
    classification_rules: z.record(z.string()),
  }),
}).passthrough();

/** Cached schema instance */
let cachedSchema: ProfileSchema | null = null;

/**
 * Load and validate profile_schema.json from the project root.
 * Results are cached after first load.
 * @returns Validated ProfileSchema object
 * @throws If schema file is missing or fails validation
 */
export function loadProfileSchema(): ProfileSchema {
  if (cachedSchema) return cachedSchema;

  const schemaPath = join(process.cwd(), 'profile_schema.json');
  const raw = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  cachedSchema = profileSchemaValidator.parse(raw);
  return cachedSchema;
}

/**
 * Extract all required fields across all sections.
 * A field is "required" if it appears in the section's `required` array
 * AND the section itself is in the root `required` array.
 * @returns Array of { section, field, description, isRootRequired }
 */
export function getRequiredFields(schema: ProfileSchema): Array<{
  section: string;
  sectionTitle: string;
  field: string;
  fieldDef: SchemaFieldDef;
  isRootRequired: boolean;
}> {
  const results: Array<{
    section: string;
    sectionTitle: string;
    field: string;
    fieldDef: SchemaFieldDef;
    isRootRequired: boolean;
  }> = [];

  const rootRequired = new Set(schema.required);

  for (const [sectionKey, sectionDef] of Object.entries(schema.properties)) {
    const sectionRequired = new Set(sectionDef.required ?? []);
    for (const [fieldKey, fieldDef] of Object.entries(sectionDef.properties)) {
      if (sectionRequired.has(fieldKey)) {
        results.push({
          section: sectionKey,
          sectionTitle: sectionDef.title,
          field: fieldKey,
          fieldDef,
          isRootRequired: rootRequired.has(sectionKey),
        });
      }
    }
  }

  return results;
}

/**
 * Get all fields (required and optional) organized by section.
 */
export function getAllFields(schema: ProfileSchema): Array<{
  section: string;
  sectionTitle: string;
  field: string;
  fieldDef: SchemaFieldDef;
  isRequired: boolean;
}> {
  const results: Array<{
    section: string;
    sectionTitle: string;
    field: string;
    fieldDef: SchemaFieldDef;
    isRequired: boolean;
  }> = [];

  for (const [sectionKey, sectionDef] of Object.entries(schema.properties)) {
    const sectionRequired = new Set(sectionDef.required ?? []);
    for (const [fieldKey, fieldDef] of Object.entries(sectionDef.properties)) {
      results.push({
        section: sectionKey,
        sectionTitle: sectionDef.title,
        field: fieldKey,
        fieldDef,
        isRequired: sectionRequired.has(fieldKey),
      });
    }
  }

  return results;
}

/**
 * Clear the cached schema (useful for testing).
 */
export function clearSchemaCache(): void {
  cachedSchema = null;
}
