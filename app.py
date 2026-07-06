import copy
import json
import os
import random
import re
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
RESOURCES_DIR = Path("/opt/data/private/cr/resources")
DATASET_DIR = RESOURCES_DIR / "yangpai_dataset"
WORKFLOW_PATH = Path(
    os.environ.get(
        "WORKFLOW_PATH",
        "/opt/data/private/cr/ComfyUI/user/default/workflows/art_workflow.json",
    )
)
DIRECT_WORKFLOW_PATH = Path(
    os.environ.get(
        "DIRECT_WORKFLOW_PATH",
        "/opt/data/private/cr/ComfyUI/user/default/workflows/art_workflow_2.json",
    )
)
COMFYUI_URL = os.environ.get("COMFYUI_URL", "http://127.0.0.1:10100").rstrip("/")
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "10101"))
CLIENT_ID = f"yangpai-web-{random.randint(100000, 999999)}"

PERSON_TEXT_GENERATE_PROMPT = """/no_think

你是一个 Stable Diffusion / ComfyUI 绘画提示词生成器。

请随机生成一段用于“人物图”绘画的中文正向提示词。

严格要求：
1. 只输出一段完整提示词，不要解释，不要标题，不要编号，不要输出 <think> 或任何分析过程。
2. 提示词必须适合直接用于 AI 绘画生图。
3. 内容必须包含：人物身份、年龄感、性别气质、发型、服装、姿态动作、表情神态、场景环境、光线、构图、画面风格。
4. 人物主体必须明确，画面要有清晰视觉中心。
5. 画面中不要出现文字、水印、签名。
6. 人物设定、场景、视角、构图、风格请随机变化。
7. 风格可以随机为：写实、插画、奇幻、古风、国潮、电影感、赛博朋克、岩画风、壁画风等。
8. 最后加入触发词：yp_rock_art, 基于南派技法的杨派岩画, 墙面壁画感, 斑驳墙面质感, 特制宣纸质感, 矿物颜料颗粒感, 手工压绘纹理;

只输出最终提示词。"""
ANIMAL_TEXT_GENERATE_PROMPT = """/no_think

你是一个 Stable Diffusion / ComfyUI 绘画提示词生成器。

请随机生成一段用于“动物图”绘画的中文正向提示词。

严格要求：
1. 只输出一段完整提示词，不要解释，不要标题，不要编号，不要输出 <think> 或任何分析过程。
2. 提示词必须适合直接用于 AI 绘画生图。
3. 内容必须包含：动物种类、外形特征、颜色、毛发/羽毛/皮肤质感、动作姿态、神态、场景环境、光线、构图、画面风格。
4. 动物主体必须明确，画面要有清晰视觉中心。
5. 画面中不要出现文字、水印、签名。
6. 动物种类、场景、视角、构图、风格请随机变化。
7. 风格可以随机为：写实、插画、奇幻、古风、电影感、国潮、岩画风、壁画风等。
8. 最后加入触发词：yp_rock_art, 基于南派技法的杨派岩画, 墙面壁画感, 斑驳墙面质感, 特制宣纸质感, 矿物颜料颗粒感, 手工压绘纹理;

只输出最终提示词。"""
FLOWER_TEXT_GENERATE_PROMPT = """/no_think

你是一个 Stable Diffusion / ComfyUI 绘画提示词生成器。

请随机生成一段用于“花卉图”绘画的中文正向提示词。

严格要求：
1. 只输出一段完整提示词，不要解释，不要标题，不要编号，不要输出 <think> 或任何分析过程。
2. 提示词必须适合直接用于 AI 绘画生图。
3. 内容必须包含：花卉种类、颜色、花瓣特征、枝叶特征、生长状态、主体形态、背景环境、光线、构图、画面风格。
4. 花卉主体必须明确，画面要有清晰视觉中心。
5. 画面中不要出现文字、水印、签名。
6. 花卉种类、背景、视角、构图、风格请随机变化。
7. 风格可以随机为：写实、插画、装饰画、工笔感、国风、电影感、岩画风、壁画风、水墨风等。
8. 最后加入触发词：yp_rock_art, 基于南派技法的杨派岩画, 墙面壁画感, 斑驳墙面质感, 特制宣纸质感, 矿物颜料颗粒感, 手工压绘纹理;

只输出最终提示词。"""
LANDSCAPE_TEXT_GENERATE_PROMPT = """/no_think

你是一个 Stable Diffusion / ComfyUI 绘画提示词生成器。

请随机生成一段用于“山水图”绘画的中文正向提示词。

严格要求：
1. 只输出一段完整提示词，不要解释，不要标题，不要编号，不要输出 <think> 或任何分析过程。
2. 提示词必须适合直接用于 AI 绘画生图。
3. 内容必须包含：山体、水体、云雾、树木、岩石等自然元素，远中近层次，天气或氛围，光线，构图，画面风格。
4. 山水画面必须有明确主体和层次感，整体构图完整。
5. 画面中不要出现文字、水印、签名。
6. 山水类型、季节、天气、视角、构图、风格请随机变化。
7. 风格可以随机为：写实风景、国风山水、插画风、电影感、壁画风、岩画风、水墨风、装饰画风等。
8. 最后加入触发词：yp_rock_art, 基于南派技法的杨派岩画, 墙面壁画感, 斑驳墙面质感, 特制宣纸质感, 矿物颜料颗粒感, 手工压绘纹理;

只输出最终提示词。"""
OTHER_TEXT_GENERATE_PROMPT = """/no_think

你是一个 Stable Diffusion / ComfyUI 绘画提示词生成器。

请随机生成一段用于“其他图”绘画的中文正向提示词。

主题范围仅限以下之一：静物、器物、建筑、民俗场景、幻想物件。

严格要求：
1. 只输出一段完整提示词，不要解释，不要标题，不要编号，不要输出 <think> 或任何分析过程。
2. 提示词必须适合直接用于 AI 绘画生图。
3. 内容必须包含：主体类型、外形特征、材质细节、造型特点、场景环境、光线、构图、画面风格。
4. 主体必须明确，画面要有清晰视觉中心。
5. 画面中不要出现文字、水印、签名。
6. 主题、场景、视角、构图、风格请随机变化。
7. 风格可以随机为：写实、插画、古风、电影感、国潮、岩画风、壁画风、装饰画风、奇幻风等。
8. 最后加入触发词：yp_rock_art, 基于南派技法的杨派岩画, 墙面壁画感, 斑驳墙面质感, 特制宣纸质感, 矿物颜料颗粒感, 手工压绘纹理;

只输出最终提示词。"""
SUBJECT_PROMPTS = {
    "人物": "人物",
    "动物": "动物",
    "花卉": "花卉",
    "山水": "山水",
    "其他": "其他",
}
TEXT_GENERATE_PROMPTS = {
    "人物": PERSON_TEXT_GENERATE_PROMPT,
    "动物": ANIMAL_TEXT_GENERATE_PROMPT,
    "花卉": FLOWER_TEXT_GENERATE_PROMPT,
    "山水": LANDSCAPE_TEXT_GENERATE_PROMPT,
    "其他": OTHER_TEXT_GENERATE_PROMPT,
}
REFERENCE_HERO = "009_p14_#U6768#U6d3e#U5ca9#U753b#U300a#U6566#U714c#U5c81#U6708#U300b#U4e8c.png"
SAMPLE_IMAGES = [
    "009_p14_#U6768#U6d3e#U5ca9#U753b#U300a#U6566#U714c#U5c81#U6708#U300b#U4e8c.png",
    "008_p13_#U6768#U6d3e#U5ca9#U753b#U300a#U6566#U714c#U5c81#U6708#U300b#U4e00.png",
    "023_p29_#U6768#U6d3e#U5ca9#U753b#U300a#U9a6c#U5230#U6210#U529f#U300b#U4e00.png",
    "040_p48_#U6768#U6d3e#U5ca9#U753b#U300a#U8036#U7a23#U964d#U4e34#U300b.png",
    "001_p05_#U6768#U6d3e#U5ca9#U753b#U300a#U5bcc#U8d35#U6ee1#U56ed#U300b.png",
]


def decode_dataset_title(path):
    stem = path.stem
    title = re.sub(r"^\d+_p\d+_", "", stem)

    def replace_unicode(match):
        return chr(int(match.group(1), 16))

    title = re.sub(r"#U([0-9a-fA-F]{4,6})", replace_unicode, title)
    return title or "杨派岩画作品"


def dataset_images():
    if not DATASET_DIR.exists():
        return []
    try:
        from PIL import Image
    except ImportError:
        Image = None

    images = []
    for path in sorted(DATASET_DIR.glob("*.png")):
        width = height = 0
        if Image is not None:
            try:
                with Image.open(path) as image:
                    width, height = image.size
            except Exception:
                continue
        images.append(
            {
                "name": path.name,
                "title": decode_dataset_title(path),
                "prompt": path.with_suffix(".txt").read_text(encoding="utf-8").strip()
                if path.with_suffix(".txt").exists()
                else decode_dataset_title(path),
                "width": width,
                "height": height,
                "ratio": (width / height) if height else 1,
                "url": f"/api/dataset-image?name={urllib.parse.quote(path.name)}",
            }
        )
    return images


def fixed_reference_payload():
    images_by_name = {item["name"]: item for item in dataset_images()}
    hero = images_by_name.get(REFERENCE_HERO)
    samples = [images_by_name[name] for name in SAMPLE_IMAGES if name in images_by_name]
    if not hero and not samples:
        return {"hero": None, "references": []}
    return {
        "hero": hero or samples[0],
        "references": samples,
    }


def json_response(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json_body(handler):
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if length <= 0:
        return {}
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))


def comfy_request(path, method="GET", payload=None, timeout=20):
    url = f"{COMFYUI_URL}{path}"
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            body = response.read()
            ctype = response.headers.get("Content-Type", "")
            return response.status, ctype, body
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ComfyUI HTTP {exc.code}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
        raise RuntimeError(f"无法连接 ComfyUI：{exc}") from exc


def load_workflow(path=WORKFLOW_PATH):
    if not path.exists():
        raise FileNotFoundError(f"workflow 文件不存在：{path}")
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def widget_input_names(node):
    return [
        item["name"]
        for item in node.get("inputs", [])
        if isinstance(item, dict) and item.get("widget") and item.get("link") is None
    ]


def normalize_widget_values(node):
    values = list(node.get("widgets_values", []))
    names = widget_input_names(node)
    if node.get("type") == "KSampler" and len(values) == len(names) + 1:
        # ComfyUI graph JSON stores the seed randomization mode after the seed.
        values = [values[0]] + values[2:]
    return values


def graph_to_api_prompt(graph):
    links = {link[0]: link for link in graph.get("links", [])}
    prompt = {}

    for node in graph.get("nodes", []):
        if node.get("type") in {"MarkdownNote", "Note"}:
            continue

        node_id = str(node["id"])
        inputs = {}
        widget_values = normalize_widget_values(node)
        widget_index = 0

        for item in node.get("inputs", []):
            name = item.get("name")
            link_id = item.get("link")
            if link_id is not None:
                link = links.get(link_id)
                if link:
                    inputs[name] = [str(link[1]), int(link[2])]
                if item.get("widget"):
                    widget_index += 1
            elif item.get("widget"):
                if widget_index < len(widget_values):
                    inputs[name] = widget_values[widget_index]
                widget_index += 1

        prompt[node_id] = {
            "class_type": node.get("type"),
            "inputs": inputs,
            "_meta": {"title": node.get("title") or node.get("type")},
        }

    return prompt


def clamp_int(value, default, minimum, maximum):
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default
    return max(minimum, min(maximum, number))


def find_node_id(prompt, class_type):
    for node_id, node in prompt.items():
        if node.get("class_type") == class_type:
            return node_id
    return None


def find_first_node_id(prompt, class_types):
    for node_id, node in prompt.items():
        if node.get("class_type") in class_types:
            return node_id
    return None


def join_prompt_parts(*parts):
    cleaned = []
    for part in parts:
        text = str(part).strip(" ，,")
        if not text:
            continue
        if cleaned and text.startswith(cleaned[-1]):
            cleaned[-1] = text
            continue
        if any(existing == text or existing.startswith(text) for existing in cleaned):
            continue
        cleaned.append(text)
    return "，".join(cleaned)


def build_full_prompt(data):
    mode = str(data.get("mode", "text")).strip()
    raw_prompt = str(data.get("prompt", "")).strip()
    if mode == "direct":
        subject = str(data.get("subject", "")).strip()
        raw_prompt = SUBJECT_PROMPTS.get(subject, "")
    if not raw_prompt:
        if mode == "direct":
            return ""
        raise ValueError("请输入画面描述")
    if len(raw_prompt) > 500:
        raise ValueError("画面描述不能超过 500 字")

    return raw_prompt


def prepare_prompt(data):
    mode = str(data.get("mode", "text")).strip()
    direct_mode = mode == "direct"
    graph = load_workflow(DIRECT_WORKFLOW_PATH if direct_mode else WORKFLOW_PATH)
    prompt = graph_to_api_prompt(copy.deepcopy(graph))
    full_prompt = build_full_prompt(data)
    save_node_id = find_node_id(prompt, "SaveImage")
    width = clamp_int(data.get("width"), 1024, 512, 2048)
    height = clamp_int(data.get("height"), 1024, 512, 2048)
    steps = clamp_int(data.get("steps"), 8, 1, 50)
    seed_value = data.get("seed")
    seed = random.randint(1, 2**48 - 1) if seed_value in (None, "", "random") else clamp_int(seed_value, 1, 1, 2**63 - 1)
    text_generate_seed = None

    required = ["95", "93", "96"]
    missing = [node_id for node_id in required if node_id not in prompt]
    if not save_node_id:
        missing.append("SaveImage")
    if missing:
        raise ValueError(f"workflow 缺少必要节点：{', '.join(missing)}")

    if direct_mode:
        text_generate_id = find_first_node_id(prompt, {"TextGenerate", "TextGenerateLTX2Prompt"})
        if not text_generate_id:
            raise ValueError("workflow 缺少必要节点：TextGenerate")
        text_generate_seed = random.randint(1, 2**63 - 1)
        prompt[text_generate_id]["inputs"]["sampling_mode.seed"] = text_generate_seed
        subject = str(data.get("subject", "")).strip()
        text_generate_prompt = TEXT_GENERATE_PROMPTS.get(subject)
        if text_generate_prompt:
            prompt[text_generate_id]["inputs"]["prompt"] = text_generate_prompt
        actual_prompt = full_prompt or str(data.get("subject", "")).strip() or "直接生成"
    else:
        actual_prompt = join_prompt_parts(prompt["95"]["inputs"].get("text", ""), full_prompt)
        prompt["95"]["inputs"]["text"] = actual_prompt
    prompt["93"]["inputs"]["width"] = width
    prompt["93"]["inputs"]["height"] = height
    prompt["93"]["inputs"]["batch_size"] = 1
    prompt["96"]["inputs"]["seed"] = seed
    prompt["96"]["inputs"]["steps"] = steps
    prompt[save_node_id]["inputs"]["filename_prefix"] = f"yangpai_rock_art/{int(time.time())}"

    meta = {"seed": seed, "width": width, "height": height, "steps": steps, "prompt": actual_prompt}
    if text_generate_seed is not None:
        meta["text_generate_seed"] = text_generate_seed
    return prompt, meta


def extract_images(history_payload, prompt_id):
    record = history_payload.get(prompt_id) or history_payload
    outputs = record.get("outputs", {}) if isinstance(record, dict) else {}
    images = []
    for node_output in outputs.values():
        for image in node_output.get("images", []):
            query = urllib.parse.urlencode(
                {
                    "filename": image.get("filename", ""),
                    "subfolder": image.get("subfolder", ""),
                    "type": image.get("type", "output"),
                }
            )
            images.append(
                {
                    "filename": image.get("filename"),
                    "subfolder": image.get("subfolder", ""),
                    "type": image.get("type", "output"),
                    "url": f"/api/image?{query}",
                }
            )
    return images


class Handler(SimpleHTTPRequestHandler):
    server_version = "YangPaiArt/1.0"

    def translate_path(self, path):
        clean = urllib.parse.urlparse(path).path
        if clean == "/":
            return str(STATIC_DIR / "index.html")
        return str(STATIC_DIR / clean.lstrip("/"))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            json_response(
                self,
                200,
                {
                    "ok": True,
                    "comfyui_url": COMFYUI_URL,
                    "workflow_path": str(WORKFLOW_PATH),
                },
            )
            return

        if path == "/api/references":
            json_response(self, 200, fixed_reference_payload())
            return

        if path.startswith("/api/status/"):
            prompt_id = path.rsplit("/", 1)[-1]
            try:
                status, _, body = comfy_request(f"/history/{urllib.parse.quote(prompt_id)}", timeout=10)
                payload = json.loads(body.decode("utf-8"))
                images = extract_images(payload, prompt_id)
                json_response(self, 200, {"done": bool(images), "images": images, "raw_status": status})
            except Exception as exc:
                json_response(self, 502, {"error": str(exc)})
            return

        if path == "/api/image":
            try:
                status, ctype, body = comfy_request(f"/view?{parsed.query}", timeout=30)
                self.send_response(status)
                self.send_header("Content-Type", ctype or "image/png")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as exc:
                json_response(self, 502, {"error": str(exc)})
            return

        if path == "/api/dataset-image":
            query = urllib.parse.parse_qs(parsed.query)
            name = Path(query.get("name", [""])[0]).name
            return self.serve_external_file(DATASET_DIR / name, "image/png")

        if path == "/assets/frontend.png":
            self.path = "/frontend.png"
            return self.serve_external_file(RESOURCES_DIR / "frontend.png", "image/png")

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/api/generate":
            json_response(self, 404, {"error": "Not found"})
            return

        try:
            data = read_json_body(self)
            prompt, meta = prepare_prompt(data)
            payload = {"prompt": prompt, "client_id": CLIENT_ID}
            _, _, body = comfy_request("/prompt", method="POST", payload=payload, timeout=30)
            result = json.loads(body.decode("utf-8"))
            json_response(self, 200, {"prompt_id": result.get("prompt_id"), "meta": meta})
        except ValueError as exc:
            json_response(self, 400, {"error": str(exc)})
        except Exception as exc:
            json_response(self, 502, {"error": str(exc)})

    def serve_external_file(self, path, content_type):
        if not path.exists():
            json_response(self, 404, {"error": "asset not found"})
            return
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(body)


def main():
    STATIC_DIR.mkdir(exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"YangPai Art site: http://127.0.0.1:{PORT}")
    print(f"ComfyUI URL: {COMFYUI_URL}")
    print(f"Workflow: {WORKFLOW_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down")
    finally:
        server.server_close()


if __name__ == "__main__":
    sys.exit(main())
