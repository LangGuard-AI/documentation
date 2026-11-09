from chunker import HARD_MAX_CHARS, chunk_markdown, slugify, strip_frontmatter


def _anchors(md):
    return [c.anchor for c in chunk_markdown(md)]


def test_slugify_matches_docusaurus():
    assert slugify("  Getting Started!  ") == "getting-started"
    assert slugify("Auth & Tokens") == "auth--tokens"
    assert slugify("API_keys and secrets") == "api_keys-and-secrets"
    assert slugify("Trailing &") == "trailing-"


def test_top_level_heading_has_no_fragment():
    assert _anchors("# Page Title\n\nintro\n\n## Section\n\nbody\n") == ["", "section"]


def test_top_level_explicit_id_has_no_fragment():
    assert _anchors("# Page Title {#top}\n\nintro\n") == [""]


def test_top_level_heading_consumes_its_slug():
    assert _anchors("# Same\n\nintro\n\n## Same\n\nbody\n") == ["", "same-1"]


def test_link_in_heading_is_reduced_to_text():
    chunk = chunk_markdown("## [API Keys](/settings/api-keys) setup\n\nbody\n")[0]
    assert chunk.anchor == "api-keys-setup"
    assert chunk.heading_path == ["API Keys setup"]


def test_repeated_headings_get_numeric_suffixes():
    md = "## Errors\n\na\n\n## Errors\n\nb\n\n## Errors\n\nc\n"
    assert _anchors(md) == ["errors", "errors-1", "errors-2"]


def test_repeat_counters_reset_per_document():
    md = "## Errors\n\na\n"
    assert _anchors(md) == ["errors"]
    assert _anchors(md) == ["errors"]


def test_explicit_id_does_not_advance_repeat_counters():
    md = "## Errors {#custom}\n\na\n\n## Errors\n\nb\n"
    assert _anchors(md) == ["custom", "errors"]


def test_basic_heading_paths():
    md = (
        "# Title\n\nIntro text under the title.\n\n"
        "## Section A\n\nBody of A.\n\n"
        "## Section B\n\nBody of B.\n"
    )
    paths = [c.heading_path for c in chunk_markdown(md)]
    assert ["Title"] in paths
    assert ["Title", "Section A"] in paths
    assert ["Title", "Section B"] in paths


def test_anchor_is_deepest_heading():
    chunks = chunk_markdown("## Auth & Tokens\n\n### Rotation\n\nsome body text here\n")
    assert chunks[0].anchor == "rotation"
    assert chunks[0].heading_path == ["Auth & Tokens", "Rotation"]


def test_explicit_anchor_used_and_stripped_from_title():
    md = "# Install {#top}\n\n## 1. Connect to the cluster {#connect}\n\nthe body\n"
    chunk = chunk_markdown(md)[0]
    assert chunk.anchor == "connect"
    assert chunk.heading_path == ["Install", "1. Connect to the cluster"]
    assert chunk.text.startswith("Install > 1. Connect to the cluster\n\n")


def test_breadcrumb_prepended_to_text():
    chunks = chunk_markdown("# Top\n\n## Nested\n\nthe body\n")
    nested = [c for c in chunks if c.heading_path == ["Top", "Nested"]][0]
    assert nested.text.startswith("Top > Nested")
    assert "the body" in nested.text


def test_code_fence_not_parsed_as_heading():
    md = (
        "## Code\n\nBefore the block.\n\n"
        "```python\n# this is a comment, not a heading\nx = 1\n```\n\n"
        "After the block.\n"
    )
    chunks = chunk_markdown(md)
    assert all(c.heading_path == ["Code"] for c in chunks)
    joined = "\n".join(c.text for c in chunks)
    assert "x = 1" in joined
    assert "# this is a comment, not a heading" in joined


def test_oversized_section_splits_on_paragraphs():
    para = "word " * 100
    md = "## Big\n\n" + "\n\n".join([para] * 6)
    big = [c for c in chunk_markdown(md, max_chars=1000) if c.heading_path == ["Big"]]
    assert len(big) >= 2
    assert all(len(c.text) <= 1200 for c in big)


def test_code_block_kept_intact_when_splitting():
    code = "```python\n" + "\n".join(f"line_{i} = {i}" for i in range(60)) + "\n```"
    md = f"## Has Code\n\nintro paragraph\n\n{code}\n\ntrailing paragraph\n"
    chunks = chunk_markdown(md, max_chars=400)
    holder = [c for c in chunks if "line_0 = 0" in c.text]
    assert len(holder) == 1
    assert holder[0].text.count("```") == 2
    assert "line_59 = 59" in holder[0].text


def test_preamble_before_first_heading():
    chunks = chunk_markdown("Some intro before any heading.\n\n# First\n\nbody\n")
    assert chunks[0].heading_path == []
    assert chunks[0].anchor == ""
    assert "Some intro" in chunks[0].text


def test_empty_and_whitespace_input():
    assert chunk_markdown("") == []
    assert chunk_markdown("\n\n   \n\n") == []


def test_giant_unbroken_block_is_hard_split():
    # A 200k-char blob with no blank lines (e.g. a base64 image) must NOT become
    # one chunk — it's force-split so every chunk stays within the hard ceiling
    # (and therefore safely under the embedding model's input cap).
    blob = "x" * 200_000
    md = f"## Big\n\n{blob}\n"
    chunks = chunk_markdown(md, max_chars=1500)
    assert len(chunks) > 10
    assert all(len(c.text) <= HARD_MAX_CHARS + 200 for c in chunks)  # + breadcrumb slack


def test_strip_frontmatter_basic():
    md = '---\nslug: /\ntitle: "Intro"\nsidebar_position: 1\n---\n\n# Welcome\n\nbody\n'
    text, meta = strip_frontmatter(md)
    assert meta == {"slug": "/", "title": "Intro", "sidebar_position": "1"}
    assert text.lstrip().startswith("# Welcome")


def test_strip_frontmatter_absent():
    text, meta = strip_frontmatter("# No frontmatter\n\nbody\n")
    assert meta == {}
    assert text.startswith("# No frontmatter")


def test_strip_mdx_imports_outside_fences_only():
    md = (
        "---\ntitle: X\n---\n"
        "import ThemedImage from '@theme/ThemedImage';\n\n"
        "# Code\n\n"
        "```python\nimport langguard\n```\n"
    )
    text, _ = strip_frontmatter(md)
    assert "ThemedImage" not in text
    assert "import langguard" in text

