/**
 * Node port of FlipHTML5's deString WASM decoder.
 * Downloads deString.js once per server instance, extracts the embedded
 * WASM and calls its DeString export to decrypt "v01..." config strings.
 */

const DESTRING_URL =
  "https://static.fliphtml5.com/resourceFiles/html5_templates/js/deString.js";
const WASM_RE = /data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)/;
const PAGE = 65536;

type Exports = {
  memory: WebAssembly.Memory;
  malloc: (n: number) => number;
  free: (p: number) => void;
  DeString: (p: number) => number;
  emscripten_stack_init: () => void;
  __wasm_call_ctors: () => void;
};

let runtimePromise: Promise<Exports> | null = null;

async function loadRuntime(): Promise<Exports> {
  const res = await fetch(DESTRING_URL, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`deString.js download failed (${res.status})`);
  const m = (await res.text()).match(WASM_RE);
  if (!m) throw new Error("Embedded deString WASM not found");
  const bytes = Buffer.from(m[1], "base64");

  let mem: WebAssembly.Memory;
  const imports = {
    env: {
      emscripten_run_script: () => {},
      emscripten_memcpy_big: (dest: number, src: number, size: number) => {
        const u8 = new Uint8Array(mem.buffer);
        u8.copyWithin(dest, src, src + size);
      },
      emscripten_resize_heap: (requested: number) => {
        const cur = mem.buffer.byteLength;
        if (requested <= cur) return 1;
        try {
          mem.grow(Math.ceil((requested - cur) / PAGE));
          return 1;
        } catch {
          return 0;
        }
      },
    },
    wasi_snapshot_preview1: {
      fd_write: (_fd: number, iovs: number, iovsLen: number, nwritten: number) => {
        const dv = new DataView(mem.buffer);
        let total = 0;
        for (let i = 0; i < iovsLen; i++) total += dv.getUint32(iovs + i * 8 + 4, true);
        dv.setUint32(nwritten, total, true);
        return 0;
      },
    },
  };

  const { instance } = await WebAssembly.instantiate(bytes, imports);
  const ex = instance.exports as unknown as Exports;
  mem = ex.memory;
  ex.emscripten_stack_init();
  ex.__wasm_call_ctors();
  return ex;
}

function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = loadRuntime().catch((e) => {
      runtimePromise = null;
      throw e;
    });
  }
  return runtimePromise;
}

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function destringDecode(value: string): Promise<string> {
  const ex = await getRuntime();
  const data = Buffer.from(value + "\0", "utf8");
  const ptr = ex.malloc(data.length);
  try {
    new Uint8Array(ex.memory.buffer).set(data, ptr);
    const out = ex.DeString(ptr);
    if (out <= 0) return "";
    const u8 = new Uint8Array(ex.memory.buffer);
    let end = out;
    while (end < u8.length && u8[end] !== 0) end++;
    let text = Buffer.from(u8.subarray(out, end)).toString("utf8");
    const cut = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
    if (cut !== -1) text = text.slice(0, cut + 1);
    return text;
  } finally {
    ex.free(ptr);
  }
}
