#!/usr/bin/env node

/**
 * innfo-mcp — MCP server wrapping @innv0/innfo-core.
 *
 * Exposes semantic iNNfo tools over stdio transport for consumption by
 * MCP clients such as OpenCode Desktop.
 *
 * Tools:
 *   list_models   — scan models/ directory for iNNfo model files
 *   read_model    — parse and return a model's full structure
 *   get_spec      — retrieve the iNNfo specification for a version
 *   get_template  — retrieve a template (business/procedures/kb)
 *   validate_model— run innfo-core validator against a template
 *   apply_change  — apply an intent operation and re-validate
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type {
  ListToolsResult,
  CallToolResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { listModels, readModel } from './tools/list-read.js';
import { getSpec, getTemplate } from './tools/spec.js';
import { validateModel, applyChange } from './tools/mutate.js';

/** Root directory for model scanning (defaults to `models/` under CWD) */
const ROOT_DIR: string = process.env.INNFO_MODELS_DIR ?? process.cwd();

const server = new Server(
  { name: 'innfo-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

/* ── Tool definitions ───────────────────────────────────────── */

const toolDefinitions: Tool[] = [
  {
    name: 'list_models',
    description: 'Scan the models directory and list all iNNfo models',
    inputSchema: {
      type: 'object',
      properties: {
        root: { type: 'string', description: 'Optional override directory to scan' },
      },
    },
  },
  {
    name: 'read_model',
    description: 'Parse and return an iNNfo model\'s full structure by its id',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Model id (filename stem, e.g. Ghostbusters_V_0-1-2_business)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_spec',
    description: 'Retrieve the iNNfo specification document for a given version',
    inputSchema: {
      type: 'object',
      properties: {
        version: { type: 'string', description: 'SemVer override (e.g. "0-1-2"). Defaults from model filename if omitted' },
        model_id: { type: 'string', description: 'Model id to derive version from' },
      },
    },
  },
  {
    name: 'get_template',
    description: 'Retrieve an iNNfo template (business/procedures/kb) by name and version',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Template name (e.g. business, procedures, catalog)' },
        version: { type: 'string', description: 'SemVer override' },
      },
      required: ['name'],
    },
  },
  {
    name: 'validate_model',
    description: 'Validate an iNNfo model against its template. Provide either id (file on disk) or content (raw text)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Model id (reads from disk)' },
        content: { type: 'string', description: 'Raw model content string (inline)' },
      },
    },
  },
  {
    name: 'apply_change',
    description: 'Apply an intent-level change to a model and re-validate. Returns updated model or validation errors',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Model id' },
        op: {
          type: 'string',
          description: 'Operation to perform',
          enum: ['add_concept', 'add_field', 'set_marker', 'add_element', 'remove_element'],
        },
        args: {
          type: 'object',
          description: 'Operation-specific arguments',
        },
      },
      required: ['id', 'op', 'args'],
    },
  },
];

/* ── Tool call dispatcher ────────────────────────────────────── */

async function dispatchTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  try {
    switch (name) {
      case 'list_models':
        return await handleListModels(args);
      case 'read_model':
        return await handleReadModel(args);
      case 'get_spec':
        return await handleGetSpec(args);
      case 'get_template':
        return await handleGetTemplate(args);
      case 'validate_model':
        return await handleValidateModel(args);
      case 'apply_change':
        return await handleApplyChange(args);
      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return errorResult(String(err));
  }
}

/* ── Handlers ────────────────────────────────────────────────── */

async function handleListModels(args: Record<string, unknown>): Promise<CallToolResult> {
  const root = (args.root as string) || ROOT_DIR;
  const models = await listModels(root);
  return textResult(JSON.stringify(models, null, 2));
}

async function handleReadModel(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = args.id as string;
  if (!id) return errorResult('Missing required argument: id');
  const model = await readModel(ROOT_DIR, id);
  if (!model) return errorResult(`Model not found: ${id}`);
  return textResult(JSON.stringify(model, null, 2));
}

async function handleGetSpec(args: Record<string, unknown>): Promise<CallToolResult> {
  const version = args.version as string | undefined;
  const modelId = args.model_id as string | undefined;
  const spec = await getSpec(ROOT_DIR, version, modelId);
  return textResult(JSON.stringify(spec, null, 2));
}

async function handleGetTemplate(args: Record<string, unknown>): Promise<CallToolResult> {
  const name = args.name as string;
  const version = args.version as string | undefined;
  if (!name) return errorResult('Missing required argument: name');
  const template = await getTemplate(ROOT_DIR, name, version);
  if (!template) return errorResult(`Template not found: ${name}${version ? ` version ${version}` : ''}`);
  return textResult(JSON.stringify(template, null, 2));
}

async function handleValidateModel(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = args.id as string | undefined;
  const content = args.content as string | undefined;
  if (!id && !content) return errorResult('Provide either id or content');
  const result = await validateModel(ROOT_DIR, id, content);
  return textResult(JSON.stringify(result, null, 2));
}

async function handleApplyChange(args: Record<string, unknown>): Promise<CallToolResult> {
  const id = args.id as string;
  const op = args.op as string;
  const opArgs = args.args as Record<string, unknown>;
  if (!id || !op || !opArgs) {
    return errorResult('Missing required arguments: id, op, args');
  }
  const result = await applyChange(ROOT_DIR, id, op, opArgs);
  return textResult(JSON.stringify(result, null, 2));
}

/* ── Response helpers ────────────────────────────────────────── */

function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] };
}

function errorResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

/* ── Handlers ────────────────────────────────────────────────── */

server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
  return { tools: toolDefinitions };
});

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;
  return dispatchTool(name, (args ?? {}) as Record<string, unknown>);
});

/* ── Start ──────────────────────────────────────────────────── */

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error starting innfo-mcp:', err);
  process.exit(1);
});
