"""Ported from chatbot_config llm_service.ResponseCleaner; see rule pack provenance."""
from typing import List, Optional, Callable

class ResponseCleaner:
    """Pipeline thống nhất cho làm sạch câu trả lời (stream và non-stream)."""

    @staticmethod
    def remove_artifacts(text: str) -> str:
        if not text:
            return text
        import re as _re

        cleaned = text
        cleaned = _re.sub(
            r"Chèn hình[^.\n]*[.\n]?", "", cleaned, flags=_re.IGNORECASE | _re.MULTILINE
        )
        cleaned = _re.sub(
            r"Xem hình[^.\n]*[.\n]?", "", cleaned, flags=_re.IGNORECASE | _re.MULTILINE
        )
        cleaned = _re.sub(
            r"Xem ảnh[^.\n]*[.\n]?", "", cleaned, flags=_re.IGNORECASE | _re.MULTILINE
        )
        cleaned = _re.sub(r"\[Hình[^\]]*\]", "", cleaned, flags=_re.IGNORECASE)
        cleaned = _re.sub(r"\(Hình[^\)]*\)", "", cleaned, flags=_re.IGNORECASE)
        cleaned = _re.sub(
            r"Chèn.*tờ rơi.*", "", cleaned, flags=_re.IGNORECASE | _re.MULTILINE
        )
        cleaned = _re.sub(r"Tờ rơi.*", "", cleaned, flags=_re.IGNORECASE | _re.MULTILINE)
        lines = cleaned.split("\n")
        out_lines = []
        for line in lines:
            line_clean = line.strip()
            if line_clean and not _re.match(
                r"^\s*(Chèn|Xem).*(hình|ảnh|tờ rơi).*$",
                line_clean,
                _re.IGNORECASE,
            ):
                out_lines.append(line)
        cleaned = "\n".join(out_lines).strip()
        cleaned = _re.sub(
            r"Chèn hình tờ rơi[^.\n]*",
            "",
            cleaned,
            flags=_re.IGNORECASE | _re.MULTILINE,
        )
        cleaned = _re.sub(
            r"Chèn.*tờ rơi[^.\n]*",
            "",
            cleaned,
            flags=_re.IGNORECASE | _re.MULTILINE,
        )
        return cleaned.strip()

    @staticmethod
    def remove_suggestion_blocks(text: str, remove: bool = True) -> str:
        if not remove or not text:
            return text
        import re as _re

        cleaned = text
        patterns = [
            r"(?m)^\s*👉\s*Gợi ý\s*:",
            r"(?m)^\s*💡\s*Gợi ý\s*:",
            r"(?m)^\s*Gợi ý\s*:",
            r"(?m)^\s*👉\s*Gợi\s*ý\s*:",
        ]
        min_pos = len(cleaned)
        found = False
        for pattern in patterns:
            m = _re.search(pattern, cleaned, _re.IGNORECASE)
            if m:
                found = True
                min_pos = min(min_pos, m.start())
        if not found:
            return cleaned
        tail = cleaned[min_pos : min_pos + 300]
        has_faq_signal = any(
            x in tail
            for x in (
                "https://",
                "http://",
                "🔗",
                "tham khảo",
                "xem thêm",
                "liên hệ",
                "phụ huynh",
                "học sinh",
            )
        )
        if not has_faq_signal:
            return cleaned[:min_pos].strip()
        return cleaned

    @staticmethod
    def strip_topic_section_metadata(text: str) -> str:
        if not text or "Topic:" not in text:
            return text
        import re as _re

        t = text
        t = _re.sub(r"Topic:\s*[^\n]*\n?", "", t, flags=_re.MULTILINE)
        t = _re.sub(r"Section:\s*[^\n]*\n?", "", t, flags=_re.MULTILINE)
        return t.strip()

    @staticmethod
    def normalize_markdown_table_boundaries(text: str) -> str:
        """
        Tách rõ đoạn văn khỏi bảng Markdown.
        Tránh renderer dính dòng 'Lưu ý:' vào ngay sau hàng cuối bảng.
        """
        if not text or "|" not in text:
            return text
        lines = text.split("\n")
        out: List[str] = []
        for i, line in enumerate(lines):
            cur = line.rstrip()
            prev_non_empty = ""
            j = len(out) - 1
            while j >= 0:
                if out[j].strip():
                    prev_non_empty = out[j].strip()
                    break
                j -= 1
            # Nếu vừa kết thúc hàng bảng và bắt đầu đoạn văn -> chèn dòng trống.
            if (
                prev_non_empty.startswith("|")
                and prev_non_empty.endswith("|")
                and cur.strip()
                and not cur.strip().startswith("|")
                and (not out or out[-1].strip() != "")
            ):
                out.append("")
            out.append(cur)
            # Nếu dòng hiện tại là hàng bảng và dòng tiếp theo là "Lưu ý" thì ép thêm dòng trống.
            nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
            if (
                cur.strip().startswith("|")
                and cur.strip().endswith("|")
                and nxt
                and not nxt.startswith("|")
                and (
                    nxt.lower().startswith("lưu ý")
                    or nxt.lower().startswith("**lưu ý")
                    or nxt.lower().startswith("ghi chú")
                )
            ):
                out.append("")
        return "\n".join(out).strip()

    @staticmethod
    def clean(
        text: str,
        *,
        remove_suggestions: bool = True,
        strip_topic_meta: bool = True,
        ensure_vietnamese_fn: Optional[Callable[[str], str]] = None,
    ) -> str:
        t = ResponseCleaner.remove_artifacts(text)
        t = ResponseCleaner.remove_suggestion_blocks(t, remove=remove_suggestions)
        if strip_topic_meta:
            t = ResponseCleaner.strip_topic_section_metadata(t)
        t = ResponseCleaner.normalize_markdown_table_boundaries(t)
        if ensure_vietnamese_fn:
            t = ensure_vietnamese_fn(t)
        return (t or "").strip()
