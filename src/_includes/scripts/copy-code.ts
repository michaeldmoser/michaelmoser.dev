import {
  type CodeClipboard,
  type CodeRoot,
  enhanceCodeBlocks
} from '../../../lib/copy-code.ts'

if (navigator.clipboard) {
  enhanceCodeBlocks(
    document as unknown as CodeRoot,
    navigator.clipboard as CodeClipboard,
    (fn, ms) => setTimeout(fn, ms)
  )
}
