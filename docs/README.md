## local dev

### init

```bash
uv venv --python 3.12
source .venv/bin/activate

```
### install
```bash
uv pip install pymdown-extensions
uv pip install mkdocs-material
cd ./docs
uv pip install -r requirements/requirements.txt
```

### debug
```bash
mkdocs serve
```
执行上述命令后，可通过 `http://127.0.0.1:8000` 地址查看生成的文档内容，当修改文档后，页面内容会自动更新。

### deploy
```bash
mkdocs build
```

执行上述命令后，会在 `site` 目录下生成文档站点的静态文件，将目录中的内容复制到任意 HTTP 服务器上即可完成文档的部署。


