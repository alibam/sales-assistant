/**
 * Document Processor - 文档处理器
 * 负责将长文本切分为适合向量化的小块（Chunk）
 */

export interface ChunkOptions {
  maxChunkSize?: number; // 默认 500 字符
  overlap?: number; // 默认 50 字符重叠
}

/**
 * 将长文本切分为小块（Chunk）
 *
 * 策略：
 * 1. 优先按段落切分（\n\n）
 * 2. 如果段落过长，按固定字数切分（如 500 字）
 * 3. 保留一定的重叠（overlap），避免语义断裂
 *
 * @param text - 原始文本
 * @param options - 切片选项
 * @returns 文本块数组
 */
export function chunkText(
  text: string,
  options?: ChunkOptions
): string[] {
  const maxChunkSize = options?.maxChunkSize ?? 500;
  const overlap = options?.overlap ?? 50;

  // 清理文本：去除多余空白
  const cleanedText = text.trim().replace(/\r\n/g, '\n');

  // 如果文本本身就很短，直接返回
  if (cleanedText.length <= maxChunkSize) {
    return [cleanedText];
  }

  const chunks: string[] = [];

  // 首先按段落分割（\n\n）
  const paragraphs = cleanedText.split(/\n\n+/).filter(p => p.trim().length > 0);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();

    // 如果当前段落本身就超长，需要强制切分
    if (trimmedParagraph.length > maxChunkSize) {
      // 先保存当前累积的 chunk
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // 对超长段落进行强制切分（带重叠）
      const subChunks = splitLongParagraph(trimmedParagraph, maxChunkSize, overlap);
      chunks.push(...subChunks);
      continue;
    }

    // 尝试将段落加入当前 chunk
    const potentialChunk = currentChunk
      ? `${currentChunk}\n\n${trimmedParagraph}`
      : trimmedParagraph;

    if (potentialChunk.length <= maxChunkSize) {
      // 可以加入当前 chunk
      currentChunk = potentialChunk;
    } else {
      // 当前 chunk 已满，保存并开始新 chunk
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = trimmedParagraph;
    }
  }

  // 保存最后一个 chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * 对超长段落进行强制切分（带重叠）
 */
function splitLongParagraph(
  paragraph: string,
  maxChunkSize: number,
  overlap: number
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < paragraph.length) {
    const end = Math.min(start + maxChunkSize, paragraph.length);
    const chunk = paragraph.slice(start, end);
    chunks.push(chunk.trim());

    // 下一个 chunk 从 (end - overlap) 开始，保留重叠
    start = end - overlap;

    // 如果剩余文本很短，直接包含在最后一个 chunk 中
    if (paragraph.length - start <= overlap) {
      break;
    }
  }

  return chunks;
}
