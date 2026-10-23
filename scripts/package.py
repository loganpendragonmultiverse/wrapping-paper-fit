from pathlib import Path
import hashlib
import json
import re
import zipfile

metadata = json.loads(Path("package.json").read_text(encoding="utf-8"))
version = metadata.get("version")
if metadata.get("name") != "wrapping-paper-fit" or not isinstance(version, str) or not re.fullmatch(
    r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)", version
):
    raise ValueError("Packaging requires this project name and a stable semantic version")

root = Path("dist")
archive = root / f"wrapping-paper-fit-{version}.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as package:
    for file in sorted(root.rglob("*")):
        relative = file.relative_to(root)
        root_document = len(relative.parts) == 1 and (
            file.suffix == ".md" or file.name in {"index.html", "LICENSE"}
        )
        source_or_examples = relative.parts[0] in {"source", "examples"}
        if file.is_file() and (root_document or source_or_examples):
            info = zipfile.ZipInfo(
                relative.as_posix(), date_time=(2026, 1, 1, 0, 0, 0)
            )
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, file.read_bytes())
(root / "SHA256SUMS").write_text(
    hashlib.sha256(archive.read_bytes()).hexdigest() + "  " + archive.name + "\n",
    encoding="utf-8",
)
print(archive, "created")
