from pathlib import Path
import zipfile, hashlib
root=Path('dist')
archive=root/'wrapping-paper-fit-1.0.0.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as z:
    for p in sorted(root.rglob('*')):
        relative=p.relative_to(root)
        root_document = len(relative.parts) == 1 and (p.suffix == '.md' or p.name in {'index.html', 'LICENSE'})
        source_or_examples = relative.parts[0] in {'source', 'examples'}
        if p.is_file() and (root_document or source_or_examples):
            info=zipfile.ZipInfo(relative.as_posix(),date_time=(2026,1,1,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=0o100644<<16
            z.writestr(info,p.read_bytes())
(root/'SHA256SUMS').write_text(hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+archive.name+'\n')
print(archive, 'created')
