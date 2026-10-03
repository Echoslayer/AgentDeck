"""macOS integration check: python3 tools/check-audio.py (requires say + ffmpeg)."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('build_audio', ROOT / 'cli/build-audio.py')
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)
for value in [{}, {'../bad': {'sentences': ['第一句。']}}, {'one': {'sentences': ['第一句。第二句。']}}, {'one': {'sentences': ['第一句。'], 'record': [{'at': 2, 'clear': True}]}}]:
    try:
        module.validate(value)
    except ValueError:
        pass
    else:
        raise AssertionError(f'Should reject {value}')
with tempfile.TemporaryDirectory(prefix='agentdeck-audio-check-') as tmp:
    root = Path(tmp)
    manifest = root / 'narration.json'
    data = {'one': {'sentences': ['第一句測試。', '第二句測試。']}, 'two': {'sentences': ['保留這個音檔。']}}
    manifest.write_text(json.dumps(data, ensure_ascii=False))
    cmd = ['python3', str(ROOT / 'cli/build-audio.py'), str(manifest)]
    subprocess.run(cmd, check=True)
    saved = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (root / 'audio').glob('two.*')}
    data['one']['sentences'] = ['只重建第一頁。']
    manifest.write_text(json.dumps(data, ensure_ascii=False))
    subprocess.run(cmd + ['--page', 'one'], check=True)
    assert saved == {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (root / 'audio').glob('two.*')}
    notes = json.loads((root / 'audio/one.speech.json').read_text())
    assert notes['speech'] == '只重建第一頁。' and notes['cues'] == [0]
    assert '保留這個音檔。' in (root / 'narration.generated.js').read_text()
    before = (root / 'narration.generated.js').read_bytes()
    bad = subprocess.run(cmd + ['--page', 'missing'], capture_output=True)
    assert bad.returncode != 0 and (root / 'narration.generated.js').read_bytes() == before
print('PASS audio build: validation、MP3/cues generation、single-page rebuild preserves other pages')
