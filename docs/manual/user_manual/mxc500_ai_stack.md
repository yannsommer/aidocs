# MXC500 AI Stack 展示应用

基于 **MXC500 开源GPU** 优化的 AI 展示应用，集成 Ollama 和 Open WebUI，提供完整的本地大语言模型解决方案。

## 🚀 特性

- ✅ **MXC500 GPU 加速** - 专门优化的GPU设备映射和资源配置
- ✅ **Open WebUI** - 现代化的Web界面，支持多模型切换
- ✅ **Ollama后端** - 高性能的本地模型服务
- ✅ **资源优化** - 针对边缘计算设备的内存和CPU优化
- ✅ **模型管理** - 便捷的模型下载和管理工具
- ✅ **缓存支持** - 可选的Redis缓存提升性能
- ✅ **一键部署** - 自动化部署脚本，开箱即用

## 📋 系统要求

### 硬件要求

- **GPU**: MXC500 开源GPU
- **内存**: 最少4GB，推荐8GB+
- **存储**: 至少20GB可用空间
- **CPU**: 双核心以上

### 软件要求

- **操作系统**: Ubuntu 20.04+ / Debian 11+
- **Docker**: 20.10+
- **Docker Compose**: v2.0+
- **MXC500驱动**: 已正确安装和配置

## 🛠 安装部署

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd mxc500-ai-stack
```

### 2. 检查MXC500设备

```bash
ls -la /dev/mxc500
# 应该显示设备文件存在
```

### 3. 配置环境变量（可选）

```bash
# 编辑 .env 文件自定义配置
vim .env
```

### 4. 一键启动

```bash
# 基础启动（推荐）
./start.sh start

# 或带Redis缓存启动
./start.sh start-cache
```

## 🎯 使用指南

### 启动和停止

```bash
# 启动服务
./start.sh start

# 启动服务（含缓存）
./start.sh start-cache

# 停止服务
./start.sh stop

# 重启服务
./start.sh restart
```

### 服务管理

```bash
# 查看服务状态
./start.sh status

# 查看实时日志
./start.sh logs

# 拉取最新镜像
./start.sh pull

# 清理系统资源
./start.sh clean
```

### 模型管理

```bash
# 进入模型管理界面
./start.sh model

# 或直接使用Docker命令
docker exec -it mxc500-ollama ollama pull llama3.1:7b
docker exec -it mxc500-ollama ollama list
docker exec -it mxc500-ollama ollama rm model-name
```

## 🌐 访问地址

启动成功后，通过以下地址访问服务：

- **Open WebUI**: http://localhost:3000
- **Ollama API**: http://localhost:11434
- **Redis缓存**: localhost:6379 (可选)

## 📊 推荐模型

针对MXC500性能特点，推荐以下模型：

| 模型名称       | 大小 | 用途     | 推荐指数 |
| -------------- | ---- | -------- | -------- |
| `llama3.1:7b`  | ~4GB | 通用对话 | ⭐⭐⭐⭐⭐    |
| `qwen2:7b`     | ~4GB | 中文优化 | ⭐⭐⭐⭐⭐    |
| `codellama:7b` | ~4GB | 代码生成 | ⭐⭐⭐⭐     |
| `mistral:7b`   | ~4GB | 轻量高效 | ⭐⭐⭐⭐     |
| `phi3:3.8b`    | ~2GB | 超轻量级 | ⭐⭐⭐      |

### 模型下载示例

```bash
# 下载通用对话模型
docker exec -it mxc500-ollama ollama pull llama3.1:7b

# 下载中文优化模型
docker exec -it mxc500-ollama ollama pull qwen2:7b

# 下载代码生成模型  
docker exec -it mxc500-ollama ollama pull codellama:7b
```

## ⚡ MXC500 优化配置

### GPU设备映射

```yaml
devices:
  - /dev/mxc500:/dev/mxc500  # MXC500设备映射
```

### 资源限制优化

```yaml
deploy:
  resources:
    limits:
      memory: 8G
    reservations:
      memory: 2G
      devices:
        - driver: mxc500
          count: 1
          capabilities: [gpu]
```

### GPU加速参数

```bash
OLLAMA_GPU_LAYERS=35          # GPU层数
OLLAMA_NUM_PARALLEL=1         # 并行数量
OLLAMA_MAX_LOADED_MODELS=1    # 最大模型数
OLLAMA_FLASH_ATTENTION=1      # Flash注意力机制
```

## 🔧 故障排除

### 常见问题

**1. MXC500设备未检测到**

```bash
# 检查设备
ls -la /dev/mxc500

# 检查驱动
lsmod | grep mxc500

# 重新安装驱动（如需要）
sudo modprobe mxc500
```

**2. 内存不足**

```bash
# 调整Ollama配置
export OLLAMA_GPU_LAYERS=20  # 减少GPU层数
export OLLAMA_MAX_LOADED_MODELS=1
```

**3. 服务启动失败**

```bash
# 查看详细日志
docker-compose logs ollama
docker-compose logs open-webui

# 检查端口占用
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :11434
```

**4. 模型下载慢**

```bash
# 使用代理或镜像加速
export HTTP_PROXY=your-proxy-url
export HTTPS_PROXY=your-proxy-url
```

### 性能调优

**1. 内存优化**

```yaml
# 增加共享内存
volumes:
  - /dev/shm:/dev/shm

# 调整系统参数
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

**2. 存储优化**

```bash
# 使用SSD存储
# 定期清理未使用镜像
docker system prune -f
```

## 📁 目录结构

```
mxc500-ai-stack/
├── docker-compose.yml      # Docker编排文件
├── .env                   # 环境变量配置
├── start.sh               # 启动脚本
├── README.md             # 说明文档
├── data/                 # 数据持久化目录
│   ├── ollama/           # Ollama数据
│   ├── open-webui/       # WebUI数据
│   └── redis/            # Redis数据（可选）
└── config/               # 配置文件目录
```

## 🤝 贡献

欢迎提交Issues和Pull Requests来改进这个项目！

## 📄 许可证

本项目基于MIT许可证开源。

## 🔗 相关链接

- [Ollama官方文档](https://github.com/ollama/ollama)
- [Open WebUI官方文档](https://github.com/open-webui/open-webui)
- [MXC500驱动下载](#)
- [Docker官方文档](https://docs.docker.com/)

---

**注意**: 请确保MXC500驱动已正确安装并配置好相应的设备权限。