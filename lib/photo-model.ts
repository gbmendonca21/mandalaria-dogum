/** A photographic plane for wall composition, not a reconstruction of product volume. */
export function createPhotoGlb(image: Uint8Array, mimeType: "image/jpeg" | "image/png", widthCm: number, heightCm: number): ArrayBuffer {
  if (![widthCm, heightCm].every(value => Number.isFinite(value) && value > 0 && value <= 9999)) {
    throw new Error("Informe largura e altura válidas para a simulação.");
  }
  if (!image.byteLength || image.byteLength > 10 * 1024 * 1024) throw new Error("Foto inválida para a simulação.");
  const width = widthCm / 100, height = heightCm / 100;
  const halfWidth = width / 2, halfHeight = height / 2;
  const parts: Uint8Array[] = [];
  const bufferViews: Array<{buffer: number; byteOffset: number; byteLength: number; target?: number}> = [];
  let binaryLength = 0;
  const add = (bytes: Uint8Array, target?: number) => {
    const padding = (4 - binaryLength % 4) % 4;
    if (padding) { parts.push(new Uint8Array(padding)); binaryLength += padding; }
    bufferViews.push({ buffer: 0, byteOffset: binaryLength, byteLength: bytes.byteLength, ...(target ? {target} : {}) });
    parts.push(bytes); binaryLength += bytes.byteLength;
    return bufferViews.length - 1;
  };
  const floats = (values: number[]) => {
    const bytes = new Uint8Array(values.length * 4), view = new DataView(bytes.buffer);
    values.forEach((value,index) => view.setFloat32(index * 4, value, true));
    return bytes;
  };
  const positions = add(floats([-halfWidth,halfHeight,0, halfWidth,halfHeight,0, halfWidth,-halfHeight,0, -halfWidth,-halfHeight,0]), 34962);
  const normals = add(floats([0,0,1, 0,0,1, 0,0,1, 0,0,1]), 34962);
  const uv = add(floats([0,0, 1,0, 1,1, 0,1]), 34962);
  const indices = new Uint8Array(12), indexView = new DataView(indices.buffer);
  [0,2,1,0,3,2].forEach((value,index) => indexView.setUint16(index * 2, value, true));
  const faces = add(indices,34963), texture = add(image);
  const gltf = {
    asset: {version:"2.0",generator:"Mandalaria photo wall preview",extras:{photographicPreview:true}},
    scene:0, scenes:[{nodes:[0]}], nodes:[{mesh:0}],
    meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1,TEXCOORD_0:2},indices:3,material:0,mode:4}]}],
    materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:1},alphaMode:"BLEND",doubleSided:true}],
    textures:[{sampler:0,source:0}], samplers:[{magFilter:9729,minFilter:9729,wrapS:33071,wrapT:33071}],
    images:[{bufferView:texture,mimeType}], buffers:[{byteLength:binaryLength}], bufferViews,
    accessors:[
      {bufferView:positions,componentType:5126,count:4,type:"VEC3",min:[-halfWidth,-halfHeight,0],max:[halfWidth,halfHeight,0]},
      {bufferView:normals,componentType:5126,count:4,type:"VEC3"},
      {bufferView:uv,componentType:5126,count:4,type:"VEC2"},
      {bufferView:faces,componentType:5123,count:6,type:"SCALAR"},
    ],
  };
  const json = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonLength = Math.ceil(json.byteLength / 4) * 4, paddedBinaryLength = Math.ceil(binaryLength / 4) * 4;
  const output = new ArrayBuffer(12 + 8 + jsonLength + 8 + paddedBinaryLength);
  const bytes = new Uint8Array(output), header = new DataView(output);
  header.setUint32(0,0x46546c67,true); header.setUint32(4,2,true); header.setUint32(8,output.byteLength,true);
  header.setUint32(12,jsonLength,true); header.setUint32(16,0x4e4f534a,true);
  bytes.fill(32,20,20+jsonLength); bytes.set(json,20);
  const binaryStart = 20 + jsonLength;
  header.setUint32(binaryStart,paddedBinaryLength,true); header.setUint32(binaryStart+4,0x004e4942,true);
  let offset = binaryStart + 8;
  for (const part of parts) { bytes.set(part,offset); offset += part.byteLength; }
  return output;
}
