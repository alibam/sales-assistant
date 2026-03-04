/**
 * 文档处理器单元测试
 * 运行: npx tsx lib/ai/__tests__/document-processor.test.ts
 */

import { chunkText } from '../document-processor';

console.log('🧪 测试文档处理器...\n');

// 测试 1: 短文本（< 500 字）
console.log('测试 1: 短文本');
const shortText = '这是一段很短的文本。';
const shortChunks = chunkText(shortText);
console.log(`输入长度: ${shortText.length}`);
console.log(`输出块数: ${shortChunks.length}`);
console.log(`✅ 预期: 1 块, 实际: ${shortChunks.length}\n`);

// 测试 2: 长文本（> 500 字）
console.log('测试 2: 长文本按段落切分');
const longText = `第一段内容。这是一段比较长的文本，用于测试文档处理器的切分功能。
我们需要确保它能够正确地按照段落进行切分。

第二段内容。这是另一段文本，它应该被单独切分出来。
段落之间用双换行符分隔。

第三段内容。这是最后一段测试文本。`;
const longChunks = chunkText(longText);
console.log(`输入长度: ${longText.length}`);
console.log(`输出块数: ${longChunks.length}`);
console.log('各块内容:');
longChunks.forEach((chunk, i) => {
  console.log(`  块 ${i + 1} (${chunk.length} 字): ${chunk.substring(0, 50)}...`);
});
console.log();

// 测试 3: 超长段落（强制切分）
console.log('测试 3: 超长段落强制切分');
const veryLongParagraph = 'A'.repeat(1200); // 1200 个字符
const veryLongChunks = chunkText(veryLongParagraph, {
  maxChunkSize: 500,
  overlap: 50,
});
console.log(`输入长度: ${veryLongParagraph.length}`);
console.log(`输出块数: ${veryLongChunks.length}`);
console.log(`✅ 预期: 3 块左右, 实际: ${veryLongChunks.length}`);
veryLongChunks.forEach((chunk, i) => {
  console.log(`  块 ${i + 1}: ${chunk.length} 字符`);
});
console.log();

// 测试 4: 自定义参数
console.log('测试 4: 自定义参数');
const customChunks = chunkText('B'.repeat(800), {
  maxChunkSize: 300,
  overlap: 30,
});
console.log(`输入长度: 800`);
console.log(`输出块数: ${customChunks.length}`);
console.log(`✅ 预期: 3 块左右, 实际: ${customChunks.length}\n`);

console.log('✅ 所有测试完成！');
