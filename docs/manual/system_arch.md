# 🚀 Nebius AI Studio 复刻版 Demo 实施方案

---

## 🎯 项目目标

- 复刻 Nebius AI Studio 的核心功能：
  1. 模型目录 + API 网关
  2. 计量与计费
  3. Web 控制台 / Playground
  4. 多租户 + 资源隔离
  5. 推理优化
  6. XPULINK.AI网站上线

---

## 🧩 功能模块拆解

### 1. **推理引擎层**

- **现成有**：`maca.modelzoo.llm.vllm` 镜像，已经提供 vLLM + PyTorch 环境。
- **需要做**：
  - 用 `docker-compose` 部署成一个 `llm-backend` 服务。
  - 配置 GPU 调度（单机先手动指定，后续 K8s Operator 支撑多机）。
  - 提供统一的 gRPC/REST API（vLLM 原生有 OpenAI-compatible API）。

### 2. **API 路由层**（调研）

- **目标**：像 Nebius 一样，统一暴露 `/v1/chat/completions` 接口。
- **技术选型**：FastAPI / Node.js（可快速封装路由 + Token 计量）。
- **关键功能**：
  - 多模型路由（比如 `qwen2.5-vl` / `llama3`）。
  - Token 计量（前后 token 数量统计）。
  - 并发限流（Kong/Gateway + Redis 计数）。

### 3. **计费与使用量管理** 

- **需求**：Nebius 提供 Usage 统计和 Billing。
- **方案**：
  - 使用 **PostgreSQL/MySQL** 存储用户调用日志。
  - 加入 `UsageTracker` 模块，统计 `输入 token + 输出 token`。
  - 周期性导出数据，展示在用户 Web 控制台（OpenCost/KubeCost 可借鉴）。
    - 计费收费
    - 人民 欧元
    - 开票

### 4. **前端展示层**

- **已有**：Open WebUI。
- **需要做**：
  - 集成后台 API（替换默认 OpenAI Key → 指向你自己的 API 网关）。
  - 支持模型切换 UI。
  - Playground 功能：可以配置批量测试、参数调节（温度、max_tokens）。
    - 自研

### 5. **用户 & 多租户**

- **实现方式**：
  - Keycloak / Auth0（SSO + OAuth2） → 用户认证。
  - Namespace + ResourceQuota（在 K8s 部署时做租户隔离）。
  - 简化版：每个用户分配一个 API Key + 限额。
    - kubesphere 128vcpu

### 6. **推理优化**  (模型适配，网站上线)

- **需要做**：
  - vLLM 本身支持 **批处理 + KV Cache**，默认开启。
  - 任务队列：用 Celery / Redis，将异步推理任务排队。
  - 缓存：在 API 层做 Prompt/Embedding 缓存（减少重复计算）。



## 🛠 实现路线

下面给出一套在**两台 MXC500 服务器**上“复刻 Nebius AI Studio（v0.5 级别）”的**最佳落地方案**——目标是1台控制面+推理主力、1台训练/异步作业，提供**模型目录 + OpenAI 兼容 API + base/fast 两档 + token 计费 + Playground + 时段伸缩 + 多租户隔离**。不依赖 KubeSphere（规避社区版 vCPU 限制），直接用**原生 K8s**+精选组件。

---

# 0. 目标能力（对标 Nebius v0.5）

* **模型目录（Catalog）**：列出/下发 Qwen3-32B、Baichuan2-13B-Chat、DeepSeek-V2-236B、CodeLlama-13B、Mistral-7B-v0.1、Qwen2-VL-72B、Qwen2.5-VL-7B 等（你已在 OpenWebUI 验证过，作为权重来源）。
* **OpenAI 兼容 API**：`/v1/chat/completions`、`/v1/completions`、`/v1/images/generations(可后置)`.
* **计费**：按输入/输出 **token** 计量定价（每模型/档位不同）；账单聚合。
* **性能档位**：`base`（低成本）/`fast`（更快响应、更高并发）。
* **多租户隔离**：Namespace + Quota + 限流；每租户可见的用量。
* **时段弹性**：工作日 **CE(S)T 8–18** 扩容、其他时段缩容到0。
* **小规模训练**：≤5GB 数据的（LoRA/QLoRA 单机、必要时2卡）。
* **演示 UI（Playground）**：选模型/档位、参数、A/B 对比、显示用量/延迟。

---

# 1. 基座与分工（两节点规划）

* **Node-1（控制+推理）**：K8s control-plane、API Gateway、Model Router、vLLM（base/fast 主力）、PostgreSQL、MinIO（单实例）。
* **Node-2（训练+异步/缓冲）**：训练 Job、异步 Worker、补充 vLLM 副本。
* **网络**：Calico（简单稳）；若后续多机训练，评估 RDMA/RoCE。
* **容器运行时**：containerd（`pause:3.10.1`，`SystemdCgroup=true`）。
* **GPU**：安装 metax-driver；优先做 **MXC500 Device Plugin**（资源名例如 `mxc500.com/gpu`）；没来得及时先用 `/dev/mxcd` 直通。

> 规避 KubeSphere 社区版 vCPU 限制：**不用 KS**；原生 K8s + ArgoCD（可选）即可。

---

# 2. 关键组件选型（精简而可扩）

* **推理引擎**：vLLM（MetaX 适配版 / 你已有镜像线）；VL 模型可分 Triton/专用服务（后置）。
* **API 网关**：Kong/Envoy（JWT/OIDC 鉴权、每租户限流、WAF 规则）。
* **Model Router**：轻量后端（Go/FastAPI），查 Catalog 将请求转发到对应 vLLM Service；负责**token 计量**与**用量落库**。
* **Catalog/计费库**：PostgreSQL（表：`models`、`model_variants`、`usage_events`）。
* **对象存储**：MinIO（单实例）+ EU S3（异步备份/复制）；权重与微调产物。
* **计量**：API 层分词（与模型一致的 tokenizer/tiktoken/sentencepiece；与 vLLM `usage` 交叉校验）。
* **弹性**：KEDA（Cron Scaler：CEST 8–18 扩容，其余缩0；后续可加队列触发）。
* **前端**：Next.js Playground（模型/档位选择、A/B、usage & latency 展示）。
* **监控**：Prometheus + Grafana + Loki；**自研 MXC500 Exporter**（功耗/温度/显存/SM 利用/ECC），vLLM 指标采集。
* **身份**：Keycloak（OIDC；演示可先匿名/演示租户）。

---

# 3. 目录与部署形态（建议仓库结构）

```
ai-studio/
  charts/
    vllm/                 # vLLM Helm Chart（支持 base/fast 参数化）
    api-router/           # OpenAI 兼容 + 计量 + 路由
    keda-cron/            # 工作日时段扩缩容
    playground/           # Next.js 前端
  sql/
    001_models.sql        # models & model_variants
    002_usage.sql         # usage_events
  values/
    vllm-base.yaml
    vllm-fast.yaml
    api-router.yaml
    keda.yaml
    playground.yaml
```

---

# 4. 模型与档位（如何“像 Nebius”）

* **Catalog 表**保存：模型ID、variant、S3路径、上下文上限、**qos=base/fast**、`price_in/out_per_1k`、建议副本。
* **base 档**：1 卡，`--max-num-seqs` 小、较低副本；**低价**。
* **fast 档**：2 卡或更高副本、**更大 batch**、优先队列、**预热不缩0**；**高价**。
* **示例**

  * `qwen3-32b`：fast 2 卡；base 1 卡
  * `mistral-7b`：fast 1 卡（高副本/大批）；base 1 卡（小批）
  * `deepseek-v2-236b`：建议只开**演示样条**（上下文/并发受限，给清晰“高价/高延迟”提示）

---

# 5. 多租户隔离与限流

* **K8s**：每租户 1 个 Namespace + ResourceQuota（GPU/CPU/内存/PVC≤5Gi）+ NetworkPolicy（只放行 MinIO/S3/API）。
* **网关**：基于 `tenant_id`（JWT claim）做令牌桶限流（RPS/并发），超额 429。
* **安全**：只读根文件系统、最小 capabilities、镜像签名（Harbor）。

---

# 6. 时段弹性与“冷启动”体验

* **KEDA Cron**：Mon–Fri, 08:00–18:00 CEST，`base/fast` 目标副本≥N；其他时段=0（fast 可保留1以抗冷启）。
* **预热**：07:30 预拉镜像与“暖启动”副本，使 08:00 响应稳定。
* **缓存**：HF/权重缓存到本地 NVMe；监控 vLLM KV-cache 命中率。

---

# 7. 小训练（≤5GB）

* **单机 Job（LoRA/QLoRA）**：从 MinIO 拉数据 → 本地 NVMe 训练 → 产物回传 S3；`ActiveDeadlineSeconds`+`ttlSecondsAfterFinished` 自动清理。
* **训练优先级低**：Volcano（可选）将推理设高优先级/可抢占；或通过节点 taints 将训练尽量跑 Node-2。

---

# 8. 交付节奏（最快落地版）

* **Day 1–2**：kubeadm 装 K8s、metax-driver、（可选）Device Plugin；装 MinIO + PostgreSQL；上 Prom/Grafana/Loki。
* **Day 3–4**：vLLM（base/fast）两套，跑通两款模型（如 Mistral-7B、Qwen3-32B）；API Router + OpenAI 兼容；usage 落库。
* **Day 5**：KEDA Cron、预热脚本、前端 Playground（A/B 对比、usage 可视）；演示租户与限流。
* **Day 6**：小训练 Job 验证（≤5GB）；仪表盘（GPU/延迟/吞吐/错误率）。
* **Day 7**：彩排与问题清单（冷启/显存/并发/限流/账单导出）。

---

# 9. 成功验收（SLA/KPI 建议）

* **可用性**：工作时段可用 ≥99.5%
* **延迟**（7B-class，小上下文）：P50 < 120ms（取决 batch/硬件调参）
* **计量**：API 层 usage 与 vLLM usage 误差 <2%
* **安全**：租户隔离有效、镜像签名启用、日志/指标落 EU 存储
* **演示看点**：base/fast 价差+速度差、A/B 对比、用量账单、时段伸缩动态图

---

# 10. 关键样例（超精简）

**vLLM(Helm values) — base**

```yaml
model:
  id: mistral-7b
  variant: v1
  s3_uri: s3://modelzoo/mistral-7b
replicas: 0
infer:
  tp: 1
  max_num_seqs: 32
gpu:
  resourceName: mxc500.com/gpu
  count: 1
resources:
  requests: { cpu: "2", memory: "8Gi" }
  limits:   { cpu: "4", memory: "16Gi" }
```

**vLLM — fast（更大批/更多GPU/更高副本）**

```yaml
model:
  id: mistral-7b
  variant: fast
replicas: 0
infer:
  tp: 1
  max_num_seqs: 64
gpu:
  resourceName: mxc500.com/gpu
  count: 2
```

**KEDA Cron（CEST）**

```yaml
spec:
  scaleTargetRef: { name: vllm-mistral-fast }
  triggers:
  - type: cron
    metadata:
      timezone: Europe/Berlin
      start: "0 8 * * 1-5"
      end:   "0 18 * * 1-5"
      desiredReplicas: "2"
  - type: cron
    metadata:
      timezone: Europe/Berlin
      start: "0 18 * * 1-5"
      end:   "0 8 * * 1-5"
      desiredReplicas: "0"
```

**usage 表（计费流水）**

```sql
CREATE TABLE usage_events(
  id uuid primary key,
  ts timestamptz default now(),
  tenant_id text, model_id text, variant text, req_id text,
  prompt_tokens int, completion_tokens int,
  price_in numeric(12,6), price_out numeric(12,6),
  latency_ms int, status int
);
```

---

# 11. 风险与缓解

* **MXC500 生态**：Operator/Exporter 需自研 → 先最小可用（整卡），后续补 vGPU/更细指标。
* **两节点存储 HA**：不做分布式 MinIO，采用**单实例 + EU S3 复制**备份。
* **大模型（如 236B）**：内存/显存/加载时长较大 → 仅做“受控演示配置”，明确 fast 档价差与 SLA。
* **冷启动**：提前预热 + 常驻1个 fast 副本；Playground 引导首次请求预热提示。
* **OpenWebUI 到生产**：OpenWebUI 只是你验证模型的入口；生产以 vLLM/Triton + 自建 API 为主。

---

# 12. 为什么这是“两台 MXC500”上的最优路线

* **最少组件**实现“像 Nebius”的关键体验（目录/档位/计费/伸缩/演示 UI）。
* **避坑**：不走 KubeSphere 社区版（vCPU 限制），直接原生 K8s；存储不做高风险两节点分布式。
* **可扩展**：未来加节点即可横向扩容；逐步引入 Volcano/Kueue、多模态（图像生成）、异步/batch。

---

