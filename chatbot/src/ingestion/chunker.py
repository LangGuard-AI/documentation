from __future__ import annotations

import re
from dataclasses import dataclass
from typing import NamedTuple

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
_DOCUSAURUS_HEADING_ID_RE = re.compile(r"\s*\{#([^}\s]+)\}$")
_MARKDOWN_LINK_RE = re.compile(r"!?\[([^\]]*)\]\([^)]*\)")
_FENCE_RE = re.compile(r"^\s*(`{3,}|~{3,})")

DEFAULT_MAX_CHARS = 1500
HARD_MAX_CHARS = 8000

_MDX_LINE_RE = re.compile(r"^(import|export)\s")


@dataclass
class Chunk:
    text: str
    heading_path: list
    anchor: str


def strip_frontmatter(text: str):
    meta = {}
    if text.startswith("---"):
        lines = text.splitlines()
        if lines and lines[0].strip() == "---":
            for end, line in enumerate(lines[1:], start=1):
                if line.strip() == "---":
                    for raw in lines[1:end]:
                        if ":" in raw and not raw.startswith((" ", "\t", "-")):
                            k, v = raw.split(":", 1)
                            meta[k.strip()] = v.strip().strip("\"'")
                    text = "\n".join(lines[end + 1 :])
                    break
    out_lines = []
    in_fence = False
    fence_marker = ""
    for ln in text.splitlines():
        if _FENCE_RE.match(ln):
            if not in_fence:
                in_fence = True
                fence_marker = ln.strip()[:3]
            elif ln.strip().startswith(fence_marker):
                in_fence = False
            out_lines.append(ln)
            continue
        if not in_fence and _MDX_LINE_RE.match(ln):
            continue
        out_lines.append(ln)
    return "\n".join(out_lines), meta


def slugify(heading: str) -> str:
    """The id Docusaurus derives from heading text, before repeat suffixes."""
    s = heading.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s)
    return re.sub(r"\s", "-", s)


class _Slugger:
    """Assigns repeat suffixes per document, as github-slugger does."""

    def __init__(self):
        self._occurrences: dict[str, int] = {}

    def slug(self, heading: str) -> str:
        base = slug = slugify(heading)
        while slug in self._occurrences:
            self._occurrences[base] += 1
            slug = f"{base}-{self._occurrences[base]}"
        self._occurrences[slug] = 0
        return slug


class _Heading(NamedTuple):
    level: int
    title: str
    anchor: str


def _parse_heading(level: int, raw: str, slugger: _Slugger) -> _Heading:
    explicit = _DOCUSAURUS_HEADING_ID_RE.search(raw)
    title = _MARKDOWN_LINK_RE.sub(r"\1", raw[: explicit.start()] if explicit else raw)
    # An h1 still takes a slug even though Docusaurus renders it without an id,
    # so a later "## Same Title" comes out as same-title-1.
    anchor = explicit.group(1) if explicit else slugger.slug(title)
    return _Heading(level, title, "" if level == 1 else anchor)


def _parse_sections(text: str):
    sections = []
    stack = []
    slugger = _Slugger()
    body: list[str] = []
    in_fence = False
    fence_marker = ""

    def flush():
        sections.append(
            (
                [heading.title for heading in stack],
                stack[-1].anchor if stack else "",
                list(body),
            )
        )

    for line in text.splitlines():
        if _FENCE_RE.match(line):
            if not in_fence:
                in_fence = True
                fence_marker = line.strip()[:3]
            elif line.strip().startswith(fence_marker):
                in_fence = False
                fence_marker = ""
            body.append(line)
            continue

        if not in_fence:
            m = _HEADING_RE.match(line)
            if m:
                flush()
                heading = _parse_heading(len(m.group(1)), m.group(2).strip(), slugger)
                while stack and stack[-1].level >= heading.level:
                    stack.pop()
                stack.append(heading)
                body = []
                continue

        body.append(line)

    flush()
    return sections


def _split_into_blocks(body: str):
    blocks: list[str] = []
    cur: list[str] = []
    in_fence = False
    fence_marker = ""

    def flush_para():
        if cur and any(ln.strip() for ln in cur):
            blocks.append("\n".join(cur).strip())

    for line in body.split("\n"):
        if _FENCE_RE.match(line):
            if not in_fence:
                flush_para()
                cur = [line]
                in_fence = True
                fence_marker = line.strip()[:3]
            else:
                cur.append(line)
                if line.strip().startswith(fence_marker):
                    blocks.append("\n".join(cur))
                    cur = []
                    in_fence = False
                    fence_marker = ""
            continue

        if in_fence:
            cur.append(line)
        elif line.strip() == "":
            flush_para()
            cur = []
        else:
            cur.append(line)

    if in_fence and cur:
        blocks.append("\n".join(cur))
    else:
        flush_para()
    return blocks


def _hardwrap(text: str, limit: int):
    pieces, i, n = [], 0, len(text)
    while i < n:
        end = min(i + limit, n)
        if end < n:
            cut = max(text.rfind(" ", i, end), text.rfind("\n", i, end))
            if cut > i:
                end = cut
        pieces.append(text[i:end])
        i = end
        while i < n and text[i] in " \n":
            i += 1
    return pieces


def _pack_blocks(blocks, max_chars: int, reserve: int = 0):
    budget = max(1, max_chars - reserve)
    expanded: list[str] = []
    for b in blocks:
        expanded.extend([b] if len(b) <= HARD_MAX_CHARS else _hardwrap(b, HARD_MAX_CHARS))
    blocks = expanded
    pieces: list[str] = []
    cur: list[str] = []
    cur_len = 0
    for b in blocks:
        add_len = (2 if cur_len else 0) + len(b)
        if cur and cur_len + add_len > budget:
            pieces.append("\n\n".join(cur))
            cur, cur_len = [], 0
        cur.append(b)
        cur_len += (2 if cur_len else 0) + len(b)
    if cur:
        pieces.append("\n\n".join(cur))
    return pieces


def chunk_markdown(text: str, max_chars: int = DEFAULT_MAX_CHARS):
    chunks: list[Chunk] = []
    for heading_path, anchor, body_lines in _parse_sections(text):
        body = "\n".join(body_lines).strip()
        if not body:
            continue
        breadcrumb = " > ".join(heading_path)
        reserve = len(breadcrumb) + 2 if breadcrumb else 0
        for piece in _pack_blocks(_split_into_blocks(body), max_chars, reserve):
            out = f"{breadcrumb}\n\n{piece}" if breadcrumb else piece
            chunks.append(Chunk(text=out, heading_path=heading_path, anchor=anchor))
    return chunks
