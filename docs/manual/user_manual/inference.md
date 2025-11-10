**推理引擎的参数作用时机** ——哪些是 **模型加载/启动时固定的参数**，哪些是 **每次请求时动态传的参数**。按 **vLLM / Ollama / SGLang** 分开说明：

------

## 一、通用分类（大部分推理框架都遵循）

- **启动模型时固定的参数（一次性，跟随模型加载）**
  - 模型权重路径 / 名称
  - 并行策略（如 tensor_parallel_size, pipeline_parallel_size）
  - GPU 显存配置（device, dtype, quantization）
  - KV cache 策略（如 vLLM 的 PagedAttention 设置）
  - 最大上下文长度（context window，大部分模型启动时就决定了）
  - 模型优化选项（如是否启用 FlashAttention、量化模式等）
- **推理调用时动态传的参数（每个请求可变）**
  - **temperature**
  - **top-p** / **top-k**
  - **max tokens / max new tokens**
  - **presence_penalty / frequency_penalty**
  - **stop tokens / stop sequences**
  - **repetition penalty**（有些框架叫法不同）

这些属于 **sampling parameters（采样参数）**，调用 API 时才传进去，不会影响模型全局状态。

------

## 二、vLLM

- **启动时固定**

  - `--model /path/to/model`
  - `--tensor-parallel-size`
  - `--pipeline-parallel-size`
  - `--max-context-len`（有些需要指定）
  - `--dtype` / `--quantization`

- **调用时动态**

  - 通过 OpenAI API 接口传入：

    ```json
    {
      "model": "qwen-32b",
      "temperature": 0.7,
      "top_p": 0.9,
      "max_tokens": 512
    }
    ```

------

## 三、Ollama

- **启动时固定（在 `Modelfile` 定义）**

  - 模型基础参数：base 模型（如 `FROM llama2`）
  - KV cache 设置、量化方法（q4_K_M、q8_0 等）
  - embedding 支持与否

- **调用时动态**

  - 调用 API 时传 sampling 参数：

    ```json
    {
      "model": "llama2",
      "prompt": "Hello",
      "options": {
        "temperature": 0.8,
        "top_p": 0.9,
        "num_predict": 200
      }
    }
    ```

  - 其中 `num_predict` = `max_tokens`。

------

## 四、SGLang

- **启动时固定**

  - `--model-path`
  - `--tp` (tensor parallel)
  - `--max-context-len`
  - `--dtype` / `--quantization`

- **调用时动态**

  - 完全兼容 OpenAI API 格式：

    ```json
    {
      "model": "qwen2-72b",
      "temperature": 0.6,
      "top_p": 0.8,
      "presence_penalty": 0.1,
      "max_tokens": 1024
    }
    ```

------

## 总结对比

| 参数类型       | vLLM                                                    | Ollama                                     | SGLang                                    |
| -------------- | ------------------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| **启动时固定** | 模型路径、并行策略、量化、context length、KV cache 策略 | 模型文件/Modelfile 定义、量化、KV cache    | 模型路径、并行策略、量化、context length  |
| **调用时可调** | temperature、top-p、max_tokens、penalties               | temperature、top-p、num_predict、penalties | temperature、top-p、max_tokens、penalties |

结论：

- **模型启动时决定的：** 模型加载方式、显存/并行策略、上下文长度、量化模式。
- **模型使用过程中可改的：** temperature、top-p、max_tokens、presence/frequency penalty 等采样参数。
- vLLM / Ollama / SGLang 在 **调用时的参数** 基本一致（因为都兼容 OpenAI API 风格），差异主要在 **启动时固定参数**。

------

##  OpenAI API 风格采样参数

------

| 参数名                           | 类型          | 默认值（常见实现） | 作用                | 说明                                                         |
| -------------------------------- | ------------- | ------------------ | ------------------- | ------------------------------------------------------------ |
| `temperature`                    | float         | `1.0`              | 控制随机性          | 越大越随机（常用范围 0.0–2.0）；0 表示贪心解码               |
| `top_p`                          | float         | `1.0`              | 控制采样多样性      | nucleus sampling，取累计概率 ≤ top_p 的 token（常用 0.8–0.95） |
| `top_k`                          | int           | `-1` (不限)        | 限制候选 token 数量 | 常配合 top_p 使用；例如 top_k=50 表示只在前 50 个 token 中采样 |
| `max_tokens` 或 `max_new_tokens` | int           | 不同模型不同       | 限制生成长度        | 指定最大生成 token 数（不含输入）                            |
| `presence_penalty`               | float         | `0.0`              | 增加新话题倾向      | >0 会鼓励模型生成与上下文不同的新 token                      |
| `frequency_penalty`              | float         | `0.0`              | 惩罚重复词汇        | >0 会减少模型重复已有 token 的概率                           |
| `stop`                           | string / list | `null`             | 停止条件            | 一旦输出命中 stop 词，就立刻结束生成                         |
| `repetition_penalty`             | float         | `1.0`              | 防止重复            | 类似 frequency_penalty，但部分引擎单独实现                   |
| `logprobs`                       | int           | `null`             | 返回 token 概率     | 返回前 n 个候选 token 的概率，调试或分析用                   |
| `seed`                           | int           | 随机               | 固定随机种子        | 复现结果时使用                                               |
| `n`                              | int           | `1`                | 生成候选数          | 一次返回多少个候选结果（比如生成 3 个回答）                  |



我们的服务器 **16× MXC500，每卡 64 GB 显存** → 总显存约 **1 TB**。能跑多大的模型，主要取决于**权重精度**（每参数占多少字节）和你预留给 **KV Cache / 激活 / 碎片化** 的空间。

------

# 五 能跑多大模型？

把总显存按 80% 可用来算（其余给 KV/激活/碎片）：

- **FP16 / BF16（≈2 bytes/参数）**
  最大参数量 ≈ `1 TB × 0.8 / 2 GB ≈ 400 B`
  👉 **稳跑 70B、130B、180B** 这档都很宽裕；**300B 级**在精心调参下也可尝试（但要牺牲上下文/并发）。
- **FP8 / INT8（≈1 byte/参数）**
  最大参数量 ≈ `≈ 800 B`
  👉 **300B～400B 级**更从容，KV/并发空间更大。
- **INT4（≈0.5 byte/参数）**
  最大参数量 ≈ `≈ 1.6 T 参数`（理论值）
  👉 工程上更多用来在**同等模型下提高上下文长度/并发**，不建议拿去追天量参数的“理论极限”。

> 小结：**16×64 GB ≈ 1 TB** 的机器，做**单模型推理**，
>
> - **FP16**：稳妥到 **180B** 级，精打细算能摸 **300B+**；
> - **INT8/FP8**：**300–400B** 级更舒展；
> - **INT4**：极限更高，但实际多用于换取长上下文和并发。

------

# 六 为什么不是“显存÷字节/参”这么简单？

因为除了权重，还要给：

- **KV Cache**：长上下文/高并发时非常吃显存；
- **激活/中间张量**：prefill 阶段更大；
- **碎片化/框架开销**：vLLM/SGLang/通信缓冲等。

经验法则（推理场景）：

- 若你跑 **70B FP16**，只把**权重**分到 16 卡上，每卡 ≈ `70×2 / 16 ≈ 8.75 GB`，看似很轻松，但当 **上下文 32k**、**并发 > 8** 时，**KV** 很快占满一大半显存。
- 所以我建议**按 60–80% 的权重装载比**留富余，别把权重塞满 95% 以上。

------

# 七 参考组合常用姿势

### 档位 A：**70B FP16 / BF16（大多数业务最稳）**

- **并行**：`tensor_parallel_size=16`（每卡分到的权重约 8–9 GB）
- **场景**：32k 上下文 + 中高并发 都很稳
- **引擎**：vLLM / SGLang（Ollama 不适合多机/多卡大模型）

### 档位 B：**180B FP16（强算力演示/评测）**

- **并行**：`TP=16`（必要时叠 `pipeline_parallel_size=2` 或启用张量+流水混合）
- **调参**：降低 `max_model_len` 或把 `gpu_memory_utilization` 设到 0.85 左右
- **场景**：中等上下文（8k–16k）+ 中等并发

### 档位 C：**300B 级 FP8/INT8（探索上限）**

- **并行**：`TP=16` + 视情况加 PP
- **要求**：模型/引擎支持 FP8/INT8 加载（权重量化）
- **取舍**：长上下文和并发会互相挤占，按需取舍

> MoE（稀疏）模型的**激活参数**更小，对显存更友好；但**总权重尺寸**仍要能切分装得下（路由/专家缓存也要显存）。

------

# 八 vLLM 实操模板（单节点 16 卡）

**启动（示例）**

```bash
python -m vllm.entrypoints.openai.api_server \
  --model /models/Your-Model-Weights \
  --tensor-parallel-size 16 \
  --max-model-len 16384 \
  --kv-cache-dtype fp16 \
  --dtype auto \
  --gpu-memory-utilization 0.85 \
  --host 0.0.0.0 --port 8001
```

**何时加流水并行（PP）？**
 当单卡显存吃紧或想把激活/KV 压力进一步均摊时，可加：

```
--pipeline-parallel-size 2   # 甚至 4（视层数能否平均切）
```

> 注意：PP 会增加跨分片通信，对网络带宽/延迟更敏感（你有 100 Gb IB，条件不错）。

------

# 九 KV Cache & 并发的取舍（实务建议）

- **上下文越长**、**并发越高**，KV 占得越多。
- 先定业务主诉求（长对话？高 QPS？），再反推：
  - 长对话优先：权重做 **INT8/FP8**，把省下的显存给 **KV**；
  - 高并发优先：**调低 max_model_len**，并启用 **PagedAttention**（vLLM 默认），同时限制每请求的 `max_tokens`。
- **批处理（batching）**：vLLM 动态批合并很关键，保持输入长度接近更省显存。

------

# 十 你现在就能做的检查清单

1. 先用 **70B FP16** 跑通（作为“金标准”带宽/稳定性回线）：

- `TP=16`，`max_model_len=16k`，并发从 4→16 逐步爬升，观察稳定性与吞吐。

1. 再评估 **180B FP16**：

- 降低 `max_model_len` 到 8k，观察显存峰值与网络占用。

1. 若要 **300B 级**：

- 切到 **FP8/INT8** 权重，确保引擎/权重格式支持；
- 先以低并发+8k 长度探索，再按目标逐步放大。

------

## 结论

**16×MXC500×64 GB ≈ 1 TB 显存**：

- **FP16** 稳妥覆盖 **70B～180B**，精调可探 **300B+**；
- **INT8/FP8** 能更轻松地玩 **300B 级**，把更多显存留给 **长上下文/高并发**；
- 工程上请优先把 **70B FP16** 跑稳，再向上探索，更高性价比。

