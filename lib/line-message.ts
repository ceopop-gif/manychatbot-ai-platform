export function removeReplyLabel(text: string) {
  return text.replace(/^\s*(?:[*_~`#>-]+\s*)*ตอบโดย\s*:?[^\r\n]*(?:\r?\n|$)/i, "").trim();
}

export function formatLineReply(text: string) {
  return removeReplyLabel(text)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n(?=\s*(?:[-•*]|\d+[.)])\s+)/g, "\n\n")
    .replace(/^(#{1,6}\s+[^\n]+)\n(?!\n)/gm, "$1\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
