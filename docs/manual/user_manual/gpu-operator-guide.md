# MetaX GPU Operator 工作机制详解

## 核心概念

MetaX GPU Operator 是一个 Kubernetes Operator，用于自动化管理 MetaX GPU 设备的生命周期，包括驱动安装、设备发现、资源调度等。

## 架构组件

### 1. metax-operator (控制平面)
**作用**: Operator 的大脑，监控 ClusterOperator CRD 并协调所有组件

```
┌─────────────────────────────────────────────┐
│        metax-operator (Deployment)          │
│  • 监听 ClusterOperator CRD 变化             │
│  • 创建和管理 DaemonSets                     │
│  • 协调组件的部署顺序                         │
│  • 处理配置更新                              │
└─────────────────────────────────────────────┘
                    ↓
            监控和控制
                    ↓
        ┌───────────────────────┐
        │  ClusterOperator CRD  │
        │  定义期望状态          │
        └───────────────────────┘
```

**关键功能**:
- 监控 GPU 节点状态
- 自动创建和管理 DaemonSets
- 处理驱动版本升级
- 管理组件依赖关系

---

### 2. metax-gpu-label (发现阶段)
**执行顺序**: 第 1 步
**节点选择器**: 无限制（所有节点）

```
┌──────────────────────────────────────────┐
│     metax-gpu-label (DaemonSet)          │
│  在每个节点上运行                         │
└──────────────────────────────────────────┘
         ↓
    扫描硬件
         ↓
┌──────────────────────────────────────────┐
│  检测 MetaX GPU 设备                      │
│  • 读取 PCI 设备信息                      │
│  • 识别 GPU 型号 (如 MXC500)              │
│  • 检测 GPU 内存大小                      │
│  • 获取驱动版本信息                       │
└──────────────────────────────────────────┘
         ↓
    添加标签到节点
         ↓
┌──────────────────────────────────────────┐
│  Node Labels (自动添加)                   │
│  • metax-tech.com/gpu.installed=true     │
│  • metax-tech.com/gpu.product=MXC500     │
│  • metax-tech.com/gpu.memory=64GB        │
│  • metax-tech.com/gpu.family=MXC         │
│  • metax-tech.com/gpu.driver.major=3     │
│  • metax-tech.com/gpu.driver.minor=1     │
│  • metax-tech.com/gpu.driver.patch=0     │
└──────────────────────────────────────────┘
```

**实际效果**:

```
root@ai16:~# kubectl get nodes --show-labels | grep -o "metax-tech.com/[^,]*" | head -5
metax-tech.com/gpu.driver.major=3
metax-tech.com/gpu.driver.minor=0
metax-tech.com/gpu.driver.patch=11
metax-tech.com/gpu.family=MXC
metax-tech.com/gpu.installed=true
```



---

### 3. metax-container-runtime (运行时准备)
**执行顺序**: 第 2 步
**节点选择器**: `metax-tech.com/gpu.installed=true`

```
┌────────────────────────────────────────────┐
│  metax-container-runtime (DaemonSet)       │
│  配置容器运行时以支持 GPU                   │
└────────────────────────────────────────────┘
         ↓
    配置 containerd
         ↓
┌────────────────────────────────────────────┐
│  修改 containerd 配置                       │
│  • 注册 GPU 运行时钩子                      │
│  • 配置设备挂载路径                         │
│  • 设置 GPU 设备访问权限                    │
│  • 添加 GPU 相关环境变量                    │
└────────────────────────────────────────────┘
         ↓
    完成后添加标签
         ↓
    metax-tech.com/runtime.ready=true
```

**配置示例**:
```toml
# /etc/containerd/config.toml
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.metax]
  runtime_type = "io.containerd.runc.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.metax.options]
    BinaryName = "/usr/local/metax/bin/metax-container-runtime"
```

---

### 4. metax-driver (驱动安装)
**执行顺序**: 第 3 步
**节点选择器**: 
- `metax-tech.com/gpu.installed=true`
- `metax-tech.com/runtime.ready=true`

```
┌──────────────────────────────────────────┐
│     metax-driver (DaemonSet)             │
│  使用特权容器安装 GPU 驱动                │
└──────────────────────────────────────────┘
         ↓
    Init Container: driver-image
         ↓
┌──────────────────────────────────────────┐
│  解压驱动包到 /metax-payload              │
│  • driver-image:3.1.0.11-amd64           │
│  • 包含内核模块 (.ko)                     │
│  • 用户空间工具                           │
│  • 固件文件                               │
└──────────────────────────────────────────┘
         ↓
    Main Container: driver-manager
         ↓
┌──────────────────────────────────────────┐
│  安装驱动到主机                           │
│  1. 复制内核模块                          │
│     /lib/modules/{kernel}/metax/         │
│  2. 加载内核模块                          │
│     modprobe metax_drv                   │
│  3. 创建设备节点                          │
│     /dev/metax0, /dev/metax1...          │
│  4. 配置 udev 规则                        │
│  5. 设置权限和所有权                       │
└──────────────────────────────────────────┘
         ↓
    验证安装
         ↓
    检查 /dev/metax* 设备
```

**挂载的主机路径**:
- `/lib/modules` → 内核模块目录
- `/dev` → 设备节点
- `/usr/local/metax` → 驱动用户空间工具
- `/var/log/metax` → 驱动日志

---

### 5. metax-maca (运行时库)
**执行顺序**: 第 4 步
**节点选择器**: 
- `metax-tech.com/gpu.installed=true`
- `metax-tech.com/runtime.ready=true`

```
┌──────────────────────────────────────────┐
│      metax-maca (DaemonSet)              │
│  安装 MACA (MetaX Compute Architecture)  │
└──────────────────────────────────────────┘
         ↓
    Init Container: payload-0
         ↓
┌──────────────────────────────────────────┐
│  安装 MACA 运行时库                       │
│  • libmaca.so (MACA 核心库)              │
│  • libmacart.so (运行时)                 │
│  • libmacablas.so (线性代数)             │
│  • libmacadnn.so (深度学习算子)          │
│  • Python 绑定 (torch)                   │
└──────────────────────────────────────────┘
         ↓
    完成后添加标签
         ↓
    metax-tech.com/maca.ready=true
```

**MACA 类似于**:
- NVIDIA 的 CUDA
- AMD 的 ROCm
- 提供 GPU 计算的高层 API

**安装位置**:
```bash
/usr/local/metax/
├── lib/
│   ├── libmaca.so.3.1.0
│   ├── libmacart.so
│   └── libmacablas.so
├── include/
│   └── maca/
└── bin/
    └── maca-smi  # GPU 管理工具
```

---

### 6. metax-gpu-device (设备插件)
**执行顺序**: 第 5 步（最后）
**节点选择器**: 
- `metax-tech.com/gpu.installed=true`
- `metax-tech.com/runtime.ready=true`
- `metax-tech.com/maca.ready=true`

```
┌──────────────────────────────────────────┐
│   metax-gpu-device (DaemonSet)           │
│   Kubernetes Device Plugin               │
└──────────────────────────────────────────┘
         ↓
    注册到 kubelet
         ↓
┌──────────────────────────────────────────┐
│  通过 Device Plugin Framework             │
│  1. 连接 kubelet gRPC                    │
│     /var/lib/kubelet/device-plugins/     │
│  2. 注册资源类型                          │
│     metax-tech.com/gpu                   │
│  3. 列出可用设备                          │
│     ListAndWatch()                       │
│  4. 设备健康检查                          │
│  5. 分配设备给 Pod                        │
│     Allocate()                           │
└──────────────────────────────────────────┘
         ↓
    暴露 GPU 资源
         ↓
┌──────────────────────────────────────────┐
│  Node Capacity (kubelet)                 │
│  metax-tech.com/gpu: 2                   │
│  metax-tech.com/gpu-memory: 128Gi        │
└──────────────────────────────────────────┘
```



## 完整工作流程

### 阶段 1: 初始化（节点加入集群）
```
1. metax-gpu-label 启动
   └─→ 扫描硬件
   └─→ 添加标签: gpu.installed=true

2. metax-container-runtime 被调度（满足标签条件）
   └─→ 配置 containerd
   └─→ 添加标签: runtime.ready=true

3. metax-driver 被调度
   └─→ 安装驱动
   └─→ 创建 /dev/metax* 设备

4. metax-maca 被调度
   └─→ 安装 MACA 库
   └─→ 添加标签: maca.ready=true

5. metax-gpu-device 被调度
   └─→ 注册设备插件
   └─→ 暴露 GPU 资源
```

### 阶段 2: Pod 调度使用 GPU
```
用户创建 Pod:
───────────────────────────────────────
apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload
spec:
  containers:
  - name: app
    image: my-app:latest
    resources:
      limits:
        metax-tech.com/gpu: 1
───────────────────────────────────────
         ↓
  Kubernetes Scheduler
         ↓
    选择有 GPU 的节点
         ↓
      Kubelet
         ↓
  调用 Device Plugin Allocate()
         ↓
┌────────────────────────────────────┐
│  Device Plugin 返回:                │
│  • Devices: [/dev/metax0]          │
│  • Mounts: [/usr/local/metax]      │
│  • Envs: [MACA_VISIBLE_DEVICES=0]  │
└────────────────────────────────────┘
         ↓
    Containerd 创建容器
         ↓
┌────────────────────────────────────┐
│  容器内可以访问:                    │
│  • /dev/metax0 (GPU 设备)          │
│  • libmaca.so (MACA 库)            │
│  • 环境变量指定 GPU ID              │
└────────────────────────────────────┘
```

---

## 实际使用示例

### 查看 GPU 资源
```
root@ai16:~# kubectl describe node ai17 | grep -A 5 "Capacity:"
Capacity:
  cpu:                      128
  ephemeral-storage:        917451460Ki
  hugepages-1Gi:            0
  hugepages-2Mi:            0
  memory:                   2113403060Ki
```



### 创建使用 GPU 的 Pod
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: maca-test
spec:
  containers:
  - name: maca-app
    image: cr.metax-tech.com/public-ai-release/maca/modelzoo.llm.vllm:maca.ai3.1.0.7
    command: ["python", "-c"]
    args:
    - |
      import torch
      print(f"MACA available: {torch.cuda.is_available()}")
      print(f"GPU count: {torch.cuda.device_count()}")
      print(f"GPU name: {torch.cuda.get_device_name(0)}")
    resources:
      limits:
        metax-tech.com/gpu: 1
        memory: 8Gi
```

### GPU 监控命令
```bash
# 查看 GPU 状态
kubectl exec -it <pod-name> -- maca-smi

# 查看 GPU 进程
kubectl exec -it <pod-name> -- maca-smi pmon

# 查看设备信息
kubectl exec -it <pod-name> -- ls -la /dev/metax*
```

---

## 故障排查

### 检查各组件状态
```bash
# 1. 检查 Operator
kubectl logs -n metax-gpu deployment/metax-operator

# 2. 检查 GPU 标签
kubectl get nodes --show-labels | grep metax

# 3. 检查驱动加载
kubectl exec -n metax-gpu <metax-driver-pod> -- lsmod | grep metax

# 4. 检查设备插件注册
kubectl get node <node-name> -o json | jq '.status.capacity'

# 5. 检查设备节点
kubectl exec -n metax-gpu <metax-driver-pod> -- ls -la /dev/metax*
```

### 常见问题

**问题 1: Pod 无法调度（Insufficient metax-tech.com/gpu）**
```bash
# 检查 Device Plugin 是否运行
kubectl get pods -n metax-gpu -l app=metax-gpu-device

# 检查节点资源
kubectl describe node <node-name> | grep gpu
```

**问题 2: Pod 内无法访问 GPU**
```bash
# 检查设备挂载
kubectl describe pod <pod-name> | grep -A 10 Mounts

# 检查环境变量
kubectl exec <pod-name> -- env | grep MACA
```

---

## 依赖关系图

```
metax-operator (控制器)
    ↓ 创建
    ├─→ metax-gpu-label
    │       ↓ 添加标签后触发
    │   metax-container-runtime
    │       ↓ 运行时就绪后触发
    │   ├─→ metax-driver
    │   └─→ metax-maca
    │           ↓ 都就绪后触发
    │       metax-gpu-device
    │           ↓ 注册设备
    │       Kubernetes Scheduler
    │           ↓ 调度 Pod
    │       GPU Workloads
```

---

## 关键技术点

### 1. Kubernetes Device Plugin
- 实现 gRPC 接口
- 注册自定义资源类型
- 管理设备生命周期

### 2. DaemonSet 依赖链
- 通过 Node Label 控制调度顺序
- 确保组件按正确顺序初始化

### 3. 特权容器
- driver/maca DaemonSet 需要特权权限
- 挂载主机路径修改系统配置

### 4. Init Container 模式
- 用于准备数据（解压驱动包）
- 主容器负责实际安装和守护

---

## 总结

MetaX GPU Operator 通过以下方式简化 GPU 管理：

1. **自动化**: 无需手动在每个节点安装驱动
2. **声明式**: 通过 CRD 定义期望状态
3. **可观测**: 通过 Label 和 Pod 状态监控
4. **标准化**: 符合 Kubernetes Device Plugin 规范
5. **解耦合**: 组件独立，便于升级和维护


