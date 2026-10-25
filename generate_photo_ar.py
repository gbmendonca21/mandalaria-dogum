"""Build a photo-based, life-size wall preview GLB from the transparent cutout.

This is intentionally a flat photographic stand-in, not a scan of the real product.
Replace it with a measured 3D asset when product photography is available.
"""
import json
import struct
from pathlib import Path

ROOT = Path(__file__).parent
texture = (ROOT / "dist/assets/mandala-recorte.png").read_bytes()
out = ROOT / "dist/assets/mandala-preview.glb"

binary = bytearray()
views = []


def add_view(data, target=None):
    while len(binary) % 4:
        binary.append(0)
    offset = len(binary)
    binary.extend(data)
    view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
    if target is not None:
        view["target"] = target
    views.append(view)
    return len(views) - 1


# 45 cm wide, centered in X/Y, with the back on the wall-facing -Z side.
positions = [-.225, .225, .005, .225, .225, .005,
             .225, -.225, .005, -.225, -.225, .005]
normals = [0, 0, 1] * 4
uvs = [0, 0, 1, 0, 1, 1, 0, 1]
indices = [0, 2, 1, 0, 3, 2]
position_view = add_view(struct.pack("<12f", *positions), 34962)
normal_view = add_view(struct.pack("<12f", *normals), 34962)
uv_view = add_view(struct.pack("<8f", *uvs), 34962)
index_view = add_view(struct.pack("<6H", *indices), 34963)
texture_view = add_view(texture)

gltf = {
    "asset": {"version": "2.0", "generator": "Mandalaria photographic AR preview"},
    "scene": 0,
    "scenes": [{"nodes": [0]}],
    "nodes": [{"mesh": 0}],
    "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2},
                                "indices": 3, "material": 0, "mode": 4}]}],
    "materials": [{"pbrMetallicRoughness": {"baseColorTexture": {"index": 0},
                                            "metallicFactor": 0, "roughnessFactor": 1},
                   "alphaMode": "BLEND", "doubleSided": True}],
    "textures": [{"sampler": 0, "source": 0}],
    "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
    "images": [{"bufferView": texture_view, "mimeType": "image/png"}],
    "buffers": [{"byteLength": len(binary)}],
    "bufferViews": views,
    "accessors": [
        {"bufferView": position_view, "componentType": 5126, "count": 4, "type": "VEC3",
         "min": [-.225, -.225, .005], "max": [.225, .225, .005]},
        {"bufferView": normal_view, "componentType": 5126, "count": 4, "type": "VEC3"},
        {"bufferView": uv_view, "componentType": 5126, "count": 4, "type": "VEC2"},
        {"bufferView": index_view, "componentType": 5123, "count": 6, "type": "SCALAR"},
    ],
}
json_bytes = json.dumps(gltf, separators=(",", ":")).encode()
json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
binary += b"\0" * ((4 - len(binary) % 4) % 4)
total = 12 + 8 + len(json_bytes) + 8 + len(binary)
out.write_bytes(struct.pack("<4sII", b"glTF", 2, total)
                + struct.pack("<I4s", len(json_bytes), b"JSON") + json_bytes
                + struct.pack("<I4s", len(binary), b"BIN\0") + binary)
print(out)
