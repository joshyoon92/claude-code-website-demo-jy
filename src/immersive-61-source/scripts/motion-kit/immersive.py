#!/usr/bin/env python3
"""Source-bound build/render/catalog for the additive immersive Shorts pack.

No provider calls. Outputs belong to content/projects/immersive-motion-kit.
The existing mk.py list/build/clip interface continues to discover every piece.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
OUT = REPO / "content/projects/immersive-motion-kit"
PACK = "immersive-2026-10"
HF = ["npx", "-y", "hyperframes@0.8.105"]


def digest(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path, data):
    write_text(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def write_text(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, prefix=path.name + ".", suffix=".tmp", delete=False) as f:
        f.write(value)
        tmp = Path(f.name)
    tmp.replace(path)


def inventory():
    pieces = []
    for path in sorted((HERE / "pieces").glob("*/meta.json")):
        m = json.loads(path.read_text())
        if m.get("pack") != PACK:
            continue
        slug = m.get("slug", "")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or path.parent.name != slug:
            raise ValueError(f"Invalid slug: {path}")
        for key in ("title_ko", "category", "size", "duration", "key_at", "uses", "what", "how_to_use", "vars", "family", "source_refs", "beats", "distinction"):
            if not m.get(key):
                raise ValueError(f"{slug}: missing {key}")
        if not (path.parent / "index.html").is_file() or not (path.parent / "prompt.md").is_file():
            raise ValueError(f"{slug}: missing editable source/recreate prompt")
        if m["size"] != [1080, 830] or not 3 <= m["duration"] <= 24:
            raise ValueError(f"{slug}: not a Shorts media-box composition")
        pieces.append(m)
    return pieces


def sources(m):
    result = {}
    piece = HERE / "pieces" / m["slug"]
    brand = HERE / "brand"
    paths = {p for p in piece.rglob("*") if p.is_file() and not any(x.startswith(".") or x == "__pycache__" for x in p.relative_to(piece).parts)}
    # Core brand code can dynamically select logos/fonts. Optional pack helpers
    # are bound only when referenced; adding another pack cannot stale this one.
    paths.update(p for p in brand.rglob("*") if p.is_file() and (p.parent.name in ("fonts", "logo") or p.name in ("cha.css", "cha-motion.js", "cha-figure.js", "gsap.min.js")))
    pending = list(paths)
    visited = set()
    while pending:
        path = pending.pop()
        if path in visited or path.suffix not in (".html", ".js", ".css", ".json"):
            continue
        visited.add(path)
        for rel in re.findall(r"brand/([A-Za-z0-9_./-]+\.(?:json|js|css|html|svg|png|jpeg|jpg|webp|mp4|webm))(?![A-Za-z0-9.])", path.read_text()):
            dep = (brand / rel).resolve()
            if not dep.is_relative_to(brand.resolve()) or not dep.is_file():
                raise ValueError(f"{m['slug']}: unresolved brand dependency {rel}")
            if dep not in paths:
                paths.add(dep)
                pending.append(dep)
    for path in sorted(paths):
        result[str(path.resolve().relative_to(REPO.resolve()))] = digest(path)
    return result


def image_input(m, variables):
    if variables is not None and not isinstance(variables, dict):
        raise ValueError("Variables must be a JSON object")
    for key, limit in m.get("max_chars", {}).items():
        value = (variables or {}).get(key)
        if key != "image" and isinstance(value, str) and len(value) > limit:
            raise ValueError(f"{key} exceeds {limit} characters; shorten the text before rendering")
    for field in ("recording", "recording_poster"):
        if (variables or {}).get(field):
            raise ValueError(f"Use --media for {field}; the importer freezes video bytes and derives its poster")
    value = (variables or {}).get("image")
    if not value:
        return None
    if not isinstance(value, str) or re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", value) or "\\" in value:
        raise ValueError("Image must be a frozen local file; remote/data URLs are not accepted")
    p = Path(value)
    if not p.is_absolute():
        if ".." in p.parts:
            raise ValueError("Image path cannot traverse outside the piece")
        base = HERE if p.parts[0] == "brand" else HERE / "pieces" / m["slug"]
        p = base / p
        if not p.resolve().is_relative_to(base.resolve()):
            raise ValueError("Relative image path escapes its source directory")
    p = p.resolve(strict=True)
    if p.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
        raise ValueError("--image must be a PNG, JPEG or WebP file")
    return p


def fingerprint(m, variables=None, media=None):
    image_file = image_input(m, variables)
    data = {"sources": sources(m), "variables": variables or {}, "media_sha256": digest(media) if media else None,
            "image_sha256": digest(image_file) if image_file else None,
            "renderer": "hyperframes@0.8.105", "fps": 30, "quality": "looks"}
    if image_file:
        data["image_importer"] = "frozen-local-image-v2"
    data["fingerprint"] = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
    return data


def build(m, variables=None, media=None):
    image_file = image_input(m, variables)
    values = dict(variables or {})
    unknown = set(values) - set(m["vars"])
    if unknown:
        raise ValueError(f"{m['slug']}: unknown variables {sorted(unknown)}")
    if media:
        if "recording" not in m["vars"]:
            raise ValueError(f"{m['slug']}: does not accept a recording")
        media = Path(media).resolve(strict=True)
        if media.suffix.lower() not in (".mp4", ".mov", ".webm", ".m4v"):
            raise ValueError("--media must be a local video")
        info = probe(media)
        duration = float(info["format"]["duration"])
        if "recording_aspect" in m["vars"]:
            values["recording_aspect"] = info["streams"][0]["width"] / info["streams"][0]["height"]
        if duration + 0.04 < m.get("source_duration_min", m["duration"]):
            raise ValueError(f"{m['slug']}: recording is {duration}s; requires {m.get('source_duration_min', m['duration'])}s")
    suffix = "-" + fingerprint(m, variables, media)["fingerprint"][:12] if variables or media else ""
    dest = OUT / "build" / (m["slug"] + suffix)
    # Only the exact task-owned build directory is replaced, never source/user media.
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(HERE / "pieces" / m["slug"], dest)
    shutil.copytree(HERE / "brand", dest / "brand")
    if image_file:
        (dest / "input").mkdir(exist_ok=True)
        image_name = "image" + image_file.suffix.lower()
        shutil.copyfile(image_file, dest / "input" / image_name)
        values["image"] = "input/" + image_name
    if media:
        (dest / "input").mkdir(exist_ok=True)
        name = "recording" + media.suffix.lower()
        shutil.copyfile(media, dest / "input" / name)
        values["recording"] = "input/" + name
        if "recording_poster" in m["vars"]:
            command(["ffmpeg", "-v", "error", "-y", "-i", media, "-frames:v", "1", dest / "input/recording-poster.jpg"],
                    OUT / "logs" / (m["slug"] + "-input-poster.log"))
            values["recording_poster"] = "input/recording-poster.jpg"
    if values:
        write_json(dest / "variables.json", values)
        # check has no --variables-file flag. Bake the same overrides into the
        # task-owned build so the audit examines the values that render will use.
        entry = dest / "index.html"
        markup = entry.read_text()
        if image_file:
            markup = markup.replace("설명용 재연 · 원본 벡터 아트", "설명용 재연 · 사용자 이미지")
        match = re.search(r"data-composition-variables=(['\"])(.*?)\1", markup, re.S)
        if not match:
            raise ValueError(f"{m['slug']}: missing variable declarations")
        declarations = json.loads(html.unescape(match.group(2)))
        for field in declarations:
            if field["id"] in values:
                field["default"] = values[field["id"]]
        attr = "data-composition-variables='" + html.escape(json.dumps(declarations, ensure_ascii=False), quote=True) + "'"
        markup = markup[:match.start()] + attr + markup[match.end():]
        payload = json.dumps(values, ensure_ascii=False).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
        override = "<script>(()=>{const read=CHA.vars;CHA.vars=d=>Object.assign({},read(d)," + payload + ");})();</script>"
        # All pack pieces load CHA before their first inline script.
        markup, n = re.subn(r"<script\s*>", lambda _: override + "<script>", markup, count=1)
        if n != 1:
            raise ValueError(f"{m['slug']}: missing authored inline timeline")
        entry.write_text(markup)
    write_json(dest / "source.json", {**fingerprint(m, variables, media), "staged_variables": values})
    return dest


def command(args, log):
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open("w") as f:
        proc = subprocess.run([str(x) for x in args], stdout=f, stderr=subprocess.STDOUT)
    if proc.returncode:
        raise RuntimeError(f"Command failed ({proc.returncode}): {' '.join(map(str, args))}\n{log.read_text()[-2500:]}")


def probe(path):
    p = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height,codec_name,avg_frame_rate,nb_frames:format=duration", "-of", "json", str(path)],
                       text=True, capture_output=True, check=True)
    return json.loads(p.stdout)


def verified(m, source=None, require_poster=True):
    path = OUT / "receipts" / (m["slug"] + ".json")
    video = OUT / "renders" / (m["slug"] + ".mp4")
    if not path.is_file() or not video.is_file():
        return None
    receipt = json.loads(path.read_text())
    expected = source or fingerprint(m)
    if receipt.get("fingerprint") != expected["fingerprint"] or receipt.get("output_sha256") != digest(video):
        return None
    poster = OUT / "stills" / (m["slug"] + ".jpg")
    if require_poster and (not poster.is_file() or receipt.get("poster_sha256") != digest(poster)):
        return None
    return receipt


def complete_poster(m, slug, video, receipt, receipt_path):
    poster = OUT / "stills" / (slug + ".jpg")
    poster.parent.mkdir(parents=True, exist_ok=True)
    keys = m["key_at"] if isinstance(m["key_at"], list) else [m["key_at"]]
    command(["ffmpeg", "-v", "error", "-y", "-ss", str(keys[len(keys) // 2]), "-i", video, "-frames:v", "1",
             "-vf", "scale=540:-2", "-q:v", "3", poster], OUT / "logs" / (slug + "-poster.log"))
    receipt["poster_sha256"] = digest(poster)
    write_json(receipt_path, receipt)


def render(m, variables=None, media=None):
    # Nondefault renders cannot overwrite catalog proofs.
    custom = bool(variables or media)
    source = fingerprint(m, variables, media)
    if not custom and verified(m, source):
        print(f"Current: {m['slug']}", flush=True)
        return OUT / "renders" / (m["slug"] + ".mp4")
    suffix = "-" + source["fingerprint"][:12] if custom else ""
    slug = m["slug"] + suffix
    video = OUT / ("custom" if custom else "renders") / (slug + ".mp4")
    receipt_path = OUT / ("custom" if custom else "receipts") / (slug + ".json")
    if not custom and (receipt := verified(m, source, require_poster=False)):
        complete_poster(m, slug, video, receipt, receipt_path)
        print(f"Repaired poster: {slug}", flush=True)
        return video
    if custom and receipt_path.is_file() and video.is_file():
        receipt = json.loads(receipt_path.read_text())
        if receipt.get("fingerprint") == source["fingerprint"] and receipt.get("output_sha256") == digest(video):
            print(f"Current custom: {slug}", flush=True)
            return video
    dest = build(m, variables, media)
    video.parent.mkdir(parents=True, exist_ok=True)
    logdir = OUT / "logs"
    # Every source goes through the browser audit before rendering. Deliberate
    # masks/occlusions are annotated in their source, never suppressed here.
    command(HF + ["check", dest, "--samples", "9", "--timeout", "30000", "--json"], logdir / (slug + "-check.json"))
    args = HF + ["render", dest, "--quality", "looks", "--fps", "30", "--workers", "1", "-o", video]
    if (dest / "variables.json").is_file():
        args += ["--variables-file", dest / "variables.json"]
    command(args, logdir / (slug + "-render.log"))
    info = probe(video)
    stream = info["streams"][0]
    duration = float(info["format"]["duration"])
    if [stream["width"], stream["height"]] != m["size"] or abs(duration - m["duration"]) > 0.08:
        raise ValueError(f"{slug}: unexpected output {info}")
    if stream["avg_frame_rate"] != "30/1":
        raise ValueError(f"{slug}: unexpected fps {stream['avg_frame_rate']}")
    if fingerprint(m, variables, media)["fingerprint"] != source["fingerprint"]:
        raise ValueError(f"{slug}: source changed during render; output has not been adopted")
    receipt = {**source, "slug": m["slug"], "output": str(video.relative_to(OUT)), "output_sha256": digest(video),
               "probe": info, "paid_credits": 0, "review": "Automated browser audit and media probe; visual review recorded separately."}
    complete_poster(m, slug, video, receipt, receipt_path)
    print(f"Rendered: {slug} ({duration}s)", flush=True)
    return video


def export_clip(m, video, revision, clip_id, label=None, format_id="shorts-standard-v1.5"):
    """Export through the live Shorts crop tokens, then validate with its real reader."""
    if not re.fullmatch(r"[a-z0-9]+(?:[_-][a-z0-9]+)*", clip_id):
        raise ValueError("Clip id must be a flat lowercase identifier")
    sys.path.insert(0, str(REPO / "scripts/shorts"))
    from kit import load_tokens
    from kit.footage import Footage
    tokens = load_tokens(format_id)
    fx = tokens.get("kit.footage")
    sw, sh = fx["source_frame"]
    bw, bh = fx["crop_base"]
    mw, mh = tokens.get("regions.media.width"), tokens.get("regions.media.height")
    if [mw, mh] != m["size"]:
        raise ValueError("The selected Shorts format has a different media box")
    revision = Path(revision).resolve()
    src = revision / "sources/motion-kit" / (clip_id + ".mp4")
    out = revision / "assets/footage" / (clip_id + ".mp4")
    entry_path = revision / "sources/motion-kit" / (clip_id + ".entry.json")
    if src.exists() or out.exists() or entry_path.exists():
        raise ValueError("Clip id already exists; preserve reviewed footage and use a new id/revision")
    src.parent.mkdir(parents=True, exist_ok=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    command(["ffmpeg", "-v", "error", "-y", "-i", video, "-an", "-vf",
             f"scale={bw}:{bh}:flags=lanczos,pad={sw}:{sh}:{(sw-bw)//2}:{(sh-bh)//2}:color=0x0A0A0A,fps={fx['fps']},format=yuv420p",
             "-c:v", "libx264", "-crf", "12", "-preset", "slow", src], OUT / "logs" / (clip_id + "-clip-source.log"))
    command(["ffmpeg", "-v", "error", "-y", "-ss", "0", "-t", str(m["duration"]), "-i", src, "-an", "-vf",
             f"crop={bw}:{bh}:{(sw-bw)//2}:{(sh-bh)//2},scale={mw}:{mh}:flags={fx['scale_flags']},fps={fx['fps']},format=yuv420p",
             "-c:v", "libx264", "-crf", str(fx["crf"]), "-preset", fx["preset"], out], OUT / "logs" / (clip_id + "-clip.log"))
    entry = {"id": clip_id, "kind": "video", "source": {"file": str(src.relative_to(REPO)) if src.is_relative_to(REPO) else str(src), "sha256": digest(src)},
             "t0": 0, "dur": m["duration"], "crop": {"cx": sw//2, "cy": sh//2, "zoom": 1.0},
             "source_label": label or "그래픽 · 설명용 재연 (CHA 모션)", "file": f"assets/footage/{clip_id}.mp4", "sha256": digest(out),
             "note": f"motion-kit piece {m['slug']}; input render sha256={digest(video)}; format={format_id}"}
    # Public kit reader verifies paths and actual hashes; no fake fixture/media.
    footage = Footage(revision, {"schema": "shorts-footage-manifest.v1", "clips": [entry]}, tokens, allow_extract=False)
    footage.ensure(clip_id)
    write_json(entry_path, entry)
    print(json.dumps(entry, ensure_ascii=False, indent=2))
    return entry


def source_bundle(m):
    """Editable source is a current ZIP, never a stale/unhosted blank HTML page."""
    source = fingerprint(m)
    dest = OUT / "sources" / (m["slug"] + ".zip")
    proof = dest.with_suffix(".json")
    if dest.is_file() and proof.is_file():
        old = json.loads(proof.read_text())
        if old.get("fingerprint") == source["fingerprint"] and old.get("sha256") == digest(dest):
            return str(dest.relative_to(OUT))
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=dest.parent, suffix=".zip.tmp", delete=False) as f:
        tmp = Path(f.name)
    with zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for rel in source["sources"]:
            path = REPO / rel
            arc = "brand/" + str(path.relative_to(HERE / "brand")) if path.is_relative_to(HERE / "brand") else str(path.relative_to(HERE / "pieces" / m["slug"]))
            info = zipfile.ZipInfo(arc)
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, path.read_bytes())
        z.writestr("READ-ME.txt", "CHA immersive motion source\n\nUnzip into a directory. Preview with:\nnpx -y hyperframes@0.8.105 preview .\n\nRender with:\nnpx -y hyperframes@0.8.105 render . --quality looks --fps 30 -o output.mp4\n\nEdit index.html; prompt.md describes the choreography. Fonts/runtime retain their existing licenses.\n")
    tmp.replace(dest)
    write_json(proof, {"fingerprint": source["fingerprint"], "sha256": digest(dest)})
    return str(dest.relative_to(OUT))


def catalog():
    items = []
    for m in inventory():
        receipt = verified(m)
        item = {**m, "prompt": (HERE / "pieces" / m["slug"] / "prompt.md").read_text(),
                "rendered": receipt is not None, "src": f"renders/{m['slug']}.mp4" if receipt else None,
                "poster": f"stills/{m['slug']}.jpg" if receipt else None,
                "source": source_bundle(m)}
        items.append(item)
    OUT.mkdir(parents=True, exist_ok=True)
    write_json(OUT / "catalog.json", {"pack": PACK, "count": len(items), "rendered": sum(i["rendered"] for i in items), "items": items})
    # Keep scripts and JSON unambiguous even with user-authored text.
    payload = json.dumps(items, ensure_ascii=False).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    tpl = (HERE / "immersive-catalog.html").read_text()
    write_text(OUT / "index.html", tpl.replace("/*PACK_DATA*/[]", payload))
    print(f"Catalog: {len(items)} pieces, {sum(i['rendered'] for i in items)} source-current renders → {OUT / 'index.html'}", flush=True)
    return items


def package_delivery():
    items = inventory()
    if len(items) < 50 or any(not verified(m) for m in items):
        raise ValueError("Finish all source-current renders before packaging")
    catalog()
    downloads = OUT / "downloads"
    downloads.mkdir(exist_ok=True)
    media_files = [OUT / folder / (m["slug"] + ext) for m in items
                   for folder, ext in (("renders", ".mp4"), ("stills", ".jpg"), ("receipts", ".json"))]
    media_files += [OUT / "catalog.json", OUT / "verification.json"]
    source_files = {REPO / rel for m in items for rel in sources(m)}
    source_files.update(p for p in (HERE / "brand").rglob("*") if p.is_file())
    source_files.update([HERE / name for name in ("immersive.py", "immersive-catalog.html", "IMMERSIVE.md", "README.md")])
    source_files.update((HERE / "examples").glob("immersive-*.json"))
    result = {}
    for name, files, base in (("immersive-61-mp4.zip", media_files, OUT),
                               ("immersive-61-source.zip", sorted(source_files), REPO)):
        dest = downloads / name
        with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            for path in files:
                z.write(path, path.relative_to(base))
            z.writestr("READ-ME.txt", "61 original reusable motion compositions. 1080x830, 30fps, silent.\nMP4s are Shorts media-box modules. Source package includes editable HTML and local runtime.\nRead scripts/motion-kit/IMMERSIVE.md in the source archive for rendering and Shorts integration.\nDefault screens/data are illustrative recreations; replace with your evidence for product claims.\n")
        result[name] = {"sha256": digest(dest), "bytes": dest.stat().st_size}
    write_json(OUT / "downloads.json", result)
    print(json.dumps(result, indent=2))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("action", choices=["list", "build", "render", "clip", "catalog", "verify", "package"])
    p.add_argument("slug", nargs="?")
    p.add_argument("--family")
    p.add_argument("--vars", type=Path)
    p.add_argument("--media", type=Path)
    p.add_argument("--image", type=Path)
    p.add_argument("--rev", type=Path)
    p.add_argument("--id")
    p.add_argument("--label")
    p.add_argument("--format", default="shorts-standard-v1.5")
    a = p.parse_args()
    items = inventory()
    selected = [m for m in items if (not a.slug or m["slug"] == a.slug) and (not a.family or m["family"] == a.family)]
    if (a.slug or a.family) and not selected:
        p.error("No matching piece/family")
    variables = json.loads(a.vars.read_text()) if a.vars else None
    if a.image:
        variables = dict(variables or {}, image=str(a.image.resolve(strict=True)))
    if (variables or a.media) and len(selected) != 1:
        p.error("Custom variables/media require exactly one piece")
    if a.action == "list":
        for m in selected:
            print(f"{m['slug']:<40} {m['duration']}s  {m['title_ko']}")
    elif a.action == "build":
        for m in selected:
            print(build(m, variables, a.media))
    elif a.action == "render":
        failures = []
        for m in selected:
            try:
                render(m, variables, a.media)
            except (RuntimeError, ValueError, subprocess.CalledProcessError) as e:
                print(str(e), file=sys.stderr, flush=True)
                failures.append(m["slug"])
            finally:
                catalog()  # Registration runs even on reuse/failure; stale media is hidden.
        if failures:
            sys.exit("Failed: " + ", ".join(failures))
    elif a.action == "catalog":
        catalog()
    elif a.action == "package":
        package_delivery()
    elif a.action == "clip":
        if len(selected) != 1 or not a.rev or not a.id:
            p.error("clip needs one slug, --rev and --id")
        if a.media and not a.label:
            p.error("A real recording needs --label naming the actual source")
        video = render(selected[0], variables, a.media)
        export_clip(selected[0], video, a.rev, a.id, a.label, a.format)
        catalog()
    elif a.action == "verify":
        invalid = [m["slug"] for m in selected if not verified(m)]
        report = {"pack": PACK, "count": len(selected), "current": len(selected) - len(invalid), "missing_or_stale": invalid}
        write_json(OUT / "verification.json", report)
        print(json.dumps(report, ensure_ascii=False))
        if invalid or not 50 <= len(items) <= 100:
            sys.exit(1)


if __name__ == "__main__":
    main()
