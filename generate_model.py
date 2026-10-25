"""Create an illustrative, wall-scale mandala GLB for the storefront AR demo."""
import json
import math
import struct
from pathlib import Path

OUT = Path(__file__).parent / "dist/assets/mandala-conceitual.glb"
PALETTE = [
    (0.70, 0.43, 0.12, 1),  # warm saffron
    (0.92, 0.82, 0.61, 1),  # natural cord
    (0.60, 0.28, 0.19, 1),  # terracotta
    (0.59, 0.43, 0.20, 1),  # antique brass
]
groups = [{"positions": [], "normals": [], "indices": []} for _ in PALETTE]


def add_surface(material, vertices, normals, faces):
    group = groups[material]
    offset = len(group["positions"]) // 3
    group["positions"].extend(value for vertex in vertices for value in vertex)
    group["normals"].extend(value for normal in normals for value in normal)
    group["indices"].extend(offset + index for face in faces for index in face)


def torus(radius, tube, z, material, segments=80, sides=8):
    vertices, normals, faces = [], [], []
    for i in range(segments + 1):
        u = 2 * math.pi * i / segments
        for j in range(sides + 1):
            v = 2 * math.pi * j / sides
            nx, ny, nz = math.cos(u) * math.cos(v), math.sin(u) * math.cos(v), math.sin(v)
            vertices.append(((radius + tube * math.cos(v)) * math.cos(u),
                             (radius + tube * math.cos(v)) * math.sin(u), z + tube * math.sin(v)))
            normals.append((nx, ny, nz))
            if i < segments and j < sides:
                a = i * (sides + 1) + j
                b = a + sides + 1
                faces.extend(((a, b, a + 1), (a + 1, b, b + 1)))
    add_surface(material, vertices, normals, faces)


def ellipsoid(cx, cy, cz, rx, ry, rz, angle, material, segments=16, rings=10):
    vertices, normals, faces = [], [], []
    co, si = math.cos(angle), math.sin(angle)
    for i in range(rings + 1):
        theta = math.pi * i / rings
        for j in range(segments + 1):
            phi = 2 * math.pi * j / segments
            px = math.sin(theta) * math.cos(phi)
            py = math.sin(theta) * math.sin(phi)
            pz = math.cos(theta)
            x, y = rx * px, ry * py
            vertices.append((cx + x * co - y * si, cy + x * si + y * co, cz + rz * pz))
            nx, ny, nz = px / rx, py / ry, pz / rz
            nx, ny = nx * co - ny * si, nx * si + ny * co
            length = math.sqrt(nx * nx + ny * ny + nz * nz)
            normals.append((nx / length, ny / length, nz / length))
            if i < rings and j < segments:
                a = i * (segments + 1) + j
                b = a + segments + 1
                faces.extend(((a, b, a + 1), (a + 1, b, b + 1)))
    add_surface(material, vertices, normals, faces)


# The bounding width is about 45 cm. Its back faces the wall (negative Z).
torus(.205, .005, 0, 0)
torus(.183, .004, .006, 1)
torus(.135, .004, .010, 3)
torus(.073, .005, .014, 1)
torus(.047, .003, .019, 0)
for i in range(12):
    angle = 2 * math.pi * i / 12
    x, y = .107 * math.cos(angle), .107 * math.sin(angle)
    ellipsoid(x, y, .010, .055, .017, .009, angle, 0)
    ellipsoid(.164 * math.cos(angle), .164 * math.sin(angle), .008,
              .011, .011, .011, angle, 2)
for i in range(16):
    angle = 2 * math.pi * i / 16
    x, y = .043 * math.cos(angle), .043 * math.sin(angle)
    ellipsoid(x, y, .023, .026, .008, .005, angle, 1)
ellipsoid(0, 0, .032, .020, .020, .006, 0, 3)
for i in range(7):
    x = (i - 3) * .046
    y = -.195 + abs(i - 3) * .007
    ellipsoid(x, y - .022, .003, .003, .030, .003, 0, 1)
    ellipsoid(x, y - .059, .004, .012, .025, .005, 0, 0 if i % 2 == 0 else 1)
torus(.005, .0015, .009, 3, 20, 6)

binary = bytearray()
buffer_views = []
accessors = []
primitives = []


def pack_view(values, fmt, target):
    while len(binary) % 4:
        binary.append(0)
    offset = len(binary)
    binary.extend(struct.pack("<" + fmt * len(values), *values))
    index = len(buffer_views)
    buffer_views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(binary) - offset, "target": target})
    return index


for material, group in enumerate(groups):
    positions = group["positions"]
    pos_view = pack_view(positions, "f", 34962)
    normal_view = pack_view(group["normals"], "f", 34962)
    index_view = pack_view(group["indices"], "I", 34963)
    coords = [positions[i::3] for i in range(3)]
    pos_accessor = len(accessors)
    accessors.append({"bufferView": pos_view, "componentType": 5126, "count": len(positions)//3,
                      "type": "VEC3", "min": [min(v) for v in coords], "max": [max(v) for v in coords]})
    normal_accessor = len(accessors)
    accessors.append({"bufferView": normal_view, "componentType": 5126, "count": len(positions)//3, "type": "VEC3"})
    index_accessor = len(accessors)
    accessors.append({"bufferView": index_view, "componentType": 5125, "count": len(group["indices"]), "type": "SCALAR"})
    primitives.append({"attributes": {"POSITION": pos_accessor, "NORMAL": normal_accessor},
                       "indices": index_accessor, "material": material, "mode": 4})

gltf = {"asset": {"version": "2.0", "generator": "Mandalaria AR demo"},
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": primitives}],
        "materials": [{"pbrMetallicRoughness": {"baseColorFactor": color, "metallicFactor": .05,
                                            "roughnessFactor": .85}, "doubleSided": True} for color in PALETTE],
        "buffers": [{"byteLength": len(binary)}], "bufferViews": buffer_views, "accessors": accessors}
json_bytes = json.dumps(gltf, separators=(",", ":")).encode()
json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
binary += b"\0" * ((4 - len(binary) % 4) % 4)
total = 12 + 8 + len(json_bytes) + 8 + len(binary)
OUT.write_bytes(struct.pack("<4sII", b"glTF", 2, total) + struct.pack("<I4s", len(json_bytes), b"JSON") + json_bytes
                + struct.pack("<I4s", len(binary), b"BIN\0") + binary)
print(f"Wrote {OUT} ({len(binary) // 1024} KiB mesh data)")
