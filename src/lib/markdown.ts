import fs from 'fs'
import path from 'path'
import 'server-only'

import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

export async function getMarkdownContent(filename: string) {
  const filePath = path.join(process.cwd(), 'src/content', `${filename}.md`)
  const fileContents = fs.readFileSync(filePath, 'utf8')

  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSanitize)
    .use(rehypeStringify)

  const file = await processor.process(fileContents)

  const contentHtml = String(file)

  return {
    contentHtml,
    contentRaw: fileContents,
  }
}
