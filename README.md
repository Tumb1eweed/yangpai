# 杨派岩画生成

一个本地运行的杨派岩画风格生图网站，前端端口为 `10101`，后端通过 ComfyUI API 调用当前 workflow。

## 环境

- Conda 环境：`/opt/data/private/cr/miniconda3/envs/comfyenv`
- ComfyUI 目录：`/opt/data/private/cr/ComfyUI`
- 网站目录：`/opt/data/private/cr/artwork`
- 网站端口：`10101`
- ComfyUI 端口：`10100`
- Workflow：`/opt/data/private/cr/ComfyUI/user/default/workflows/art_workflow.json`

## 启动

先启动 ComfyUI：

```bash
cd /opt/data/private/cr/ComfyUI
/opt/data/private/cr/miniconda3/envs/comfyenv/bin/python main.py --listen 0.0.0.0 --port 10100
```

再启动网站：

```bash
cd /opt/data/private/cr/artwork
/opt/data/private/cr/miniconda3/envs/comfyenv/bin/python app.py
```

后台启动网站：

```bash
cd /opt/data/private/cr/artwork
setsid /opt/data/private/cr/miniconda3/envs/comfyenv/bin/python app.py > /tmp/yangpai-art.log 2>&1 < /dev/null &
```

访问：

```text
http://127.0.0.1:10101/
```

## 常用检查

检查网站：

```bash
python -m py_compile app.py
node --check static/app.js
node --check static/samples.js
```

查看健康状态：

```text
http://127.0.0.1:10101/api/health
```

后台日志：

```text
/tmp/yangpai-art.log
```

## 说明

- 首页用于文本生成图画和直接生成图画。
- 生成样例页为 `/samples.html`。
- 网站默认连接 `http://127.0.0.1:10100` 的 ComfyUI。
- 如需改 ComfyUI 地址，可设置环境变量 `COMFYUI_URL` 后再启动网站。
