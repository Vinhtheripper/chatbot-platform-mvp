"""Exact score-query matcher ported from TVTS; selected explicitly by admin."""
def is_tvts_score_query(q: str) -> bool:
    """Câu hỏi về ĐIỂM XÉT TUYỂN (điểm chuẩn, đậu/rớt, cách tính điểm) → cần điều hướng.
    Loại trừ điểm CỘNG ưu tiên/chứng chỉ (có trong tài liệu, vẫn trả lời được)."""
    import re as _re
    ql = (q or "").lower()
    if any(x in ql for x in ("điểm cộng", "điểm ưu tiên", "điểm khuyến khích", "cộng điểm",
                              "chuẩn đầu ra", "đầu ra")):
        return False
    kws = (
        "điểm chuẩn", "điểm trúng tuyển", "điểm đậu", "điểm đỗ", "điểm sàn", "điểm xét tuyển",
        "bao nhiêu điểm", "mấy điểm", "có đậu", "có đỗ", "có trúng tuyển", "đậu không", "đỗ không",
        "trúng tuyển không", "có được nhận", "được nhận không", "cách tính điểm",
        "tính điểm xét tuyển", "tham số xét tuyển", "đậu ngành", "đỗ ngành", "đậu vào", "đỗ vào",
        "đỗ ngành nào", "đậu ngành nào", "trúng tuyển ngành", "khả năng trúng tuyển", "khả năng đậu",
    )
    if any(k in ql for k in kws):
        return True
    # ĐGNL / kỳ thi đánh giá năng lực → luôn về công cụ tính điểm
    if "đgnl" in ql or "đánh giá năng lực" in ql:
        return True
    # "<số> điểm" trong ngữ cảnh xét tuyển/đậu-rớt (vd "821 điểm thì xét tuyển thế nào")
    if _re.search(r"\d[\d.,]*\s*điểm", ql) and any(
        c in ql for c in ("xét tuyển", "đậu", "đỗ", "trúng tuyển", "ngành", "nguyện vọng",
                          "thpt", "học bạ", "tốt nghiệp", "đại học")
    ):
        return True
    return False
