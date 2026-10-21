"""Extract ALL literal prompt blocks and the cleaner without importing TVTS runtime."""
import ast
import json
import hashlib
from pathlib import Path
root = Path(__file__).resolve().parents[2]
source = root / 'chatbot_config/chatbot-api/services/llm_service.py'
text = source.read_text()
tree = ast.parse(text)
cleaner = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == 'ResponseCleaner')
code = ast.get_source_segment(text, cleaner)
# Remove institution-specific FAQ preservation token; generic URL preservation stays.
code = code.replace('                "tuyensinh.uel.edu.vn",\n', '')
(root/'backend/app/services/response_cleaner.py').write_text(
    '"""Ported from chatbot_config llm_service.ResponseCleaner; see rule pack provenance."""\n'
    'from typing import List, Optional, Callable\n\n' + code + '\n')
fn = next(n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == '_get_system_prompt')
blocks = []
for n in ast.walk(fn):
    if isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Name):
        value = n.value
        if isinstance(value, ast.IfExp):
            value = value.orelse
        if isinstance(value, ast.Constant) and isinstance(value.value, str) and value.value.strip():
            name = n.targets[0].id
            blocks.append({'id':f'tvts_{name}_{n.lineno}', 'label':f'{name} · nguồn dòng {n.lineno}',
                           'instruction':value.value, 'enabled':True, 'source_line':n.lineno})
returned = next(n for n in fn.body if isinstance(n, ast.Return))
base = ''.join(n.value for n in returned.value.values if isinstance(n,ast.Constant))
blocks.insert(0, {'id':'tvts_base', 'label':'Toàn bộ phần prompt nền TVTS', 'instruction':base,
                  'enabled':True, 'source_line':returned.lineno})
modes_tree = ast.parse((root/'chatbot_config/chatbot-api/services/chat_modes.py').read_text())
suffixes = next(ast.literal_eval(n.value) for n in modes_tree.body if isinstance(n, ast.AnnAssign) and getattr(n.target, 'id', '') == 'MODE_LLM_SUFFIX')
for mode, instruction in suffixes.items():
    blocks.append({'id':'tvts_suffix_'+mode, 'label':'Hướng dẫn chuyên đề '+mode, 'instruction':instruction, 'enabled':True})
score_fn = next(n for n in ast.walk(tree) if isinstance(n,ast.FunctionDef) and n.name == '_is_score_query')
score_code = ast.get_source_segment(text, score_fn)
import textwrap
score_code = 'def is_tvts_score_query(q: str) -> bool:\n' + textwrap.dedent('\n'.join(score_code.splitlines()[1:]))
# Restore function body indentation after removing class indentation.
score_code = score_code.split('\n',1)[0] + '\n' + textwrap.indent(score_code.split('\n',1)[1], '    ')
(root/'backend/app/services/tvts_matchers.py').write_text('"""Exact score-query matcher ported from TVTS; selected explicitly by admin."""\n'+score_code+'\n')
out = {'id':'tvts_complete', 'label':'Thư viện khối prompt TVTS (đầy đủ nhánh literal)',
       'source_sha256':hashlib.sha256(text.encode()).hexdigest(), 'blocks':blocks,
       'notes':'Các career_block là nhánh thay thế nhau, không bật đồng thời. Nội dung gốc có UEL, năm, liên hệ và panel chưa tích hợp: rà soát trước khi áp dụng. Thư viện giữ đầy đủ khối prompt, không tự port các handler nghiệp vụ.'}
(root/'backend/app/rule_packs/tvts.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(f'Extracted {len(blocks)} prompt blocks and ResponseCleaner')
