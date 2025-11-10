# 🐧 MXC500 AI Stack - Ubuntu SSH隧道使用指南

## ⚡ 快速开始

### 1️⃣ 一键启动隧道

```bash
# 方式1: 使用快速脚本（推荐）
./scripts/quick-tunnel.sh

# 方式2: 直接使用SSH命令
ssh -CNg -L 3000:127.0.0.1:3000 -L 11434:127.0.0.1:11434 -L 8501:127.0.0.1:8501 root@140.207.205.59 -p 16022
```

### 2️⃣ 测试连接

```bash
# 在另一个终端窗口测试连接
./scripts/test-tunnel.sh
```

### 3️⃣ 访问服务

隧道建立后，在Ubuntu浏览器中访问：

| 服务           | 地址                   | 功能                    |
| -------------- | ---------------------- | ----------------------- |
| 🌐 **主界面**   | http://localhost:3000  | Open WebUI - 完整AI助手 |
| 🔧 **API服务**  | http://localhost:11434 | Ollama API接口          |
| 📊 **演示应用** | http://localhost:8501  | Streamlit演示界面       |

## 🛠️ 详细操作步骤

### 第一步：准备SSH连接

确保能正常SSH到服务器：

```bash
# 测试基础SSH连接
ssh root@140.207.205.59 -p 16022

# 如果需要配置SSH密钥（推荐）
ssh-keygen -t rsa -b 4096 -C "your_email@domain.com"
ssh-copy-id -p 16022 root@140.207.205.59
```

### 第二步：启动SSH隧道

#### 方式A：使用快速脚本（推荐新手）

```bash
# 进入项目目录
cd /path/to/mxc500-ai-stack

# 启动隧道（会一直运行直到按Ctrl+C）
./scripts/quick-tunnel.sh
```

#### 方式B：使用完整脚本（推荐高级用户）

```bash
# 功能更丰富，包含端口检查等
./scripts/mxc500-tunnel.sh
```

#### 方式C：使用tmux后台运行（推荐长期使用）

```bash
# 创建tmux会话
tmux new-session -d -s mxc500

# 在tmux中启动隧道
tmux send-keys -t mxc500 './scripts/quick-tunnel.sh' Enter

# 查看会话
tmux list-sessions

# 连接到会话（查看状态）
tmux attach-session -t mxc500

# 断开会话但保持后台运行：按 Ctrl+B 然后按 D
```

### 第三步：验证连接

```bash
# 在新终端窗口测试
./scripts/test-tunnel.sh

# 或手动测试
curl http://localhost:11434/api/tags
curl http://localhost:3000
```

## 🌐 浏览器访问指南

### 访问Open WebUI（主要界面）

1. 打开Firefox/Chrome/Edge
2. 访问：http://localhost:3000
3. 首次访问可能需要创建账户
4. 开始使用AI助手功能

### 访问API接口（开发测试）

```bash
# 获取模型列表
curl http://localhost:11434/api/tags

# 测试AI对话
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2:1b","prompt":"Hello, how are you?","stream":false}'
```

### 访问演示应用

1. 确保服务器端运行了Streamlit：

   ```bash
   # SSH到服务器
   ssh root@140.207.205.59 -p 16022
   
   # 启动Streamlit演示
   cd /root/Ben/mxc500-ai-stack
   streamlit run examples/web-demo.py --server.port 8501
   ```

2. 在本地浏览器访问：http://localhost:8501

## 🔧 常用命令和技巧

### SSH隧道管理

```bash
# 查看正在运行的SSH隧道
ps aux | grep ssh

# 查看端口占用情况
sudo netstat -tlnp | grep ":3000\|:11434\|:8501"

# 使用lsof查看端口
lsof -i :3000
lsof -i :11434

# 杀死指定端口的进程
sudo fuser -k 3000/tcp
```

### 后台运行隧道

```bash
# 使用nohup后台运行
nohup ./scripts/quick-tunnel.sh > tunnel.log 2>&1 &

# 查看后台任务
jobs

# 将任务转到前台
fg %1

# 查看日志
tail -f tunnel.log
```

### SSH配置优化

编辑 `~/.ssh/config` 文件：

```bash
Host mxc500
    HostName 140.207.205.59
    Port 16022
    User root
    LocalForward 3000 127.0.0.1:3000
    LocalForward 11434 127.0.0.1:11434
    LocalForward 8501 127.0.0.1:8501
    ServerAliveInterval 60
    ServerAliveCountMax 3
    Compression yes
```

然后可以简化连接：

```bash
ssh -CN mxc500
```

## ❗ 故障排除

### 问题1：端口被占用

```bash
# 查找占用端口的进程
sudo lsof -i :3000

# 杀死进程（替换PID）
kill -9 <PID>

# 或直接杀死端口
sudo fuser -k 3000/tcp
```

### 问题2：SSH连接超时

```bash
# 在SSH命令中添加保持连接的参数
ssh -CNg -o ServerAliveInterval=60 -o ServerAliveCountMax=3 \
    -L 3000:127.0.0.1:3000 -L 11434:127.0.0.1:11434 \
    root@140.207.205.59 -p 16022
```

### 问题3：无法访问服务

1. 检查SSH隧道是否在运行：`ps aux | grep ssh`
2. 测试连接：`./scripts/test-tunnel.sh`
3. 检查服务器端服务状态
4. 确认防火墙没有阻止本地端口

### 问题4：权限问题

```bash
# 确保脚本有执行权限
chmod +x scripts/*.sh

# 检查SSH密钥权限
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

## 📱 实用技巧

### 创建桌面快捷方式

```bash
# 创建启动隧道的桌面文件
cat > ~/Desktop/mxc500-tunnel.desktop << 'DESKTOP'
[Desktop Entry]
Version=1.0
Type=Application
Name=MXC500 AI Stack Tunnel
Comment=启动MXC500 SSH隧道
Exec=gnome-terminal -- bash -c "cd /path/to/mxc500-ai-stack && ./scripts/quick-tunnel.sh; exec bash"
Icon=network-workgroup
Terminal=true
Categories=Network;
DESKTOP

chmod +x ~/Desktop/mxc500-tunnel.desktop
```

### 自动启动隧道

```bash
# 添加到开机启动（可选）
crontab -e

# 添加以下行（替换路径）
@reboot cd /path/to/mxc500-ai-stack && ./scripts/quick-tunnel.sh
```

### 快捷别名

在 `~/.bashrc` 中添加：

```bash
# MXC500 AI Stack 快捷命令
alias mxc500-tunnel='cd /path/to/mxc500-ai-stack && ./scripts/quick-tunnel.sh'
alias mxc500-test='cd /path/to/mxc500-ai-stack && ./scripts/test-tunnel.sh'
alias mxc500-webui='firefox http://localhost:3000'
```

然后运行 `source ~/.bashrc` 生效。

## 🎯 使用场景

### 日常使用模式

```bash
# 终端1: 启动隧道
tmux new -s mxc500 './scripts/quick-tunnel.sh'

# 终端2: 测试和使用
./scripts/test-tunnel.sh
firefox http://localhost:3000

# 断开tmux但保持隧道：Ctrl+B, D
```

### 开发模式

```bash
# 只映射API端口进行开发
ssh -CNg -L 11434:127.0.0.1:11434 root@140.207.205.59 -p 16022 &

# 测试API
curl http://localhost:11434/api/tags
```

### 演示模式

```bash
# 映射所有端口
./scripts/mxc500-tunnel.sh

# 浏览器访问完整界面
firefox http://localhost:3000
```

---

## 📞 快速帮助

**快速启动**：`./scripts/quick-tunnel.sh`  
**测试连接**：`./scripts/test-tunnel.sh`  
**主要地址**：http://localhost:3000  

**遇到问题？**

1. 确认SSH基础连接正常
2. 检查本地端口是否被占用
3. 运行测试脚本诊断问题
4. 查看SSH错误信息

🎉 **现在开始使用MXC500 AI Stack吧！**