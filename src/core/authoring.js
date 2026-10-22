import { applyOperations } from './validate.js';

/** One semantic summary shared by direct, narrative, and delayed authoring. */
export function authorEdits(ctx, operations) {
  applyOperations(ctx.state, operations);
  const paths = operations.map(operation => operation.path);
  ctx.emit('author.updated', `${paths.length} edits: ${paths.slice(0, 5).map(path => path.join('.')).join(', ')}${paths.length > 5 ? '…' : ''}.`, { paths });
}
