# Agent Notes

## Project

This directory contains the Yangpai rock-art generation website.

## Runtime

- Conda env: `/opt/data/private/cr/miniconda3/envs/comfyenv`
- Website port: `10101`
- ComfyUI URL expected by the website: `http://127.0.0.1:10100`
- Workflow file: `/opt/data/private/cr/ComfyUI/user/default/workflows/art_workflow.json`

## Start Commands

Start ComfyUI first:

```bash
cd /opt/data/private/cr/ComfyUI
/opt/data/private/cr/miniconda3/envs/comfyenv/bin/python main.py --listen 0.0.0.0 --port 10100
```

Start the website:

```bash
cd /opt/data/private/cr/artwork
/opt/data/private/cr/miniconda3/envs/comfyenv/bin/python app.py
```

Detached website start:

```bash
cd /opt/data/private/cr/artwork
setsid /opt/data/private/cr/miniconda3/envs/comfyenv/bin/python app.py > /tmp/yangpai-art.log 2>&1 < /dev/null &
```

Open:

```text
http://127.0.0.1:10101/
```

## Checks

```bash
python -m py_compile app.py
node --check static/app.js
node --check static/samples.js
```

Health endpoint:

```text
http://127.0.0.1:10101/api/health
```

