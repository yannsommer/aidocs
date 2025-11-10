# XPULink API Cookbook

这是一个面向 [www.xpulink.net](https://www.xpulink.net) 平台模型的 API 使用教程和示例代码集合。通过这些示例，您可以快速上手并集成 XPULink 提供的 AI 模型服务。

## 项目简介

本项目提供了使用 XPULink API 的完整示例，包括：
- 基础文本生成模型调用
- 基于 BGE-M3 Embedding 模型的 PDF 文档问答系统
- LoRA 参数高效微调
- 使用 OpenBench 进行模型评估和测试

## 功能特性

- **文本生成**: 演示如何调用云端大语言模型（如 Qwen3-32B）进行对话和文本生成
- **PDF 智能问答**: 使用 BGE-M3 多语言 Embedding 模型构建完整的 PDF 文档问答系统
- **LoRA 微调**: 使用参数高效的 LoRA 方法对 Qwen3-32B 进行定制化微调
- **模型评估**: 使用 OpenBench 框架对 XPULink 模型进行标准化评估和测试
- **生产就绪**: 包含错误处理、环境变量配置等最佳实践


## 环境要求

- Python 3.8+
- XPULink API Key（从 [www.xpulink.net](https://www.xpulink.net) 获取）

## 使用示例

### 1. 基础文本生成

<!-- 超链接到 quick_start.md -->
[快速开始](./quick_start.md)



### 2. RAG（检索增强生成）

RAG 目录包含完整的文档问答系统示例，展示如何使用 LlamaIndex 框架构建智能检索增强生成应用。

[rag](./user_manual/rag.md)



### 3. LoRA 微调

LoRA 目录包含使用 XPULink API 对 Qwen3-32B 进行参数高效微调的完整示例，让您可以轻松定制专属的 AI 模型。

[LoRA 微调](./user_manual/lora.md)



### 4. 模型评估（OpenBench）

OpenBench 目录包含使用 OpenBench 框架对 XPULink 托管的模型进行标准化评估和测试的完整示例。

[OpenBench 评估](./user_manual/evaluation.md)



## 云端推理框架：vLLM

XPULink 平台的所有模型服务都基于 **vLLM (Very Large Language Model)** 推理框架搭建，为用户提供高性能、低成本的 AI 模型服务体验。

### 🚀 vLLM 的核心优势

#### 1. **超高吞吐量**
- 相比传统推理框架（如 HuggingFace Transformers），**吞吐量提升 15-30 倍**
- 通过高效的内存管理和批处理优化，能够同时处理更多并发请求
- 适合大规模生产环境和高并发场景

#### 2. **PagedAttention：革命性的内存管理**
- 借鉴操作系统的虚拟内存分页思想，将 KV Cache 分块存储
- **内存浪费降低 50% 以上**，显著提高 GPU 利用率
- 支持更长的上下文长度和更大的批处理规模
- 动态管理内存，避免传统方式的内存碎片问题

#### 3. **连续批处理 (Continuous Batching)**
- 支持动态调整批次大小，无需等待所有请求完成
- 新请求可以立即加入正在处理的批次
- **大幅降低平均响应延迟**，提升用户体验
- 充分利用 GPU 资源，避免空闲浪费

#### 4. **广泛的模型支持**
- 原生支持主流开源模型：GPT、LLaMA、Qwen、ChatGLM、Baichuan 等
- 兼容 HuggingFace 模型格式，易于部署
- 支持多种量化方案（AWQ、GPTQ、SqueezeLLM）
- 支持 LoRA 适配器动态加载和切换

#### 5. **OpenAI 兼容 API**
- 完全兼容 OpenAI API 规范，无需修改现有代码
- 支持流式输出 (streaming)、Function Calling 等高级特性
- 降低迁移成本，快速切换到自托管或私有云部署

#### 6. **低延迟推理**
- 优化的 CUDA 内核和算子融合技术
- 支持 FP16、BF16、INT8 等多种精度，灵活平衡速度与质量
- 针对 Transformer 架构深度优化，首 token 延迟更低

#### 7. **高可扩展性**
- 支持张量并行和流水线并行
- 轻松扩展到多 GPU、多节点集群
- 适配各类 GPU（MXC500，NVIDIA A100、H100、A10 等）

### 💡 为什么选择 vLLM？

| 对比维度 | vLLM | 传统推理框架 |
|---------|------|-------------|
| **吞吐量** | ⭐⭐⭐⭐⭐ 15-30x | ⭐ 1x |
| **内存效率** | ⭐⭐⭐⭐⭐ 节省 50%+ | ⭐⭐ 常见浪费 |
| **延迟** | ⭐⭐⭐⭐ 动态批处理 | ⭐⭐⭐ 静态批处理 |
| **并发能力** | ⭐⭐⭐⭐⭐ 超高并发 | ⭐⭐ 有限并发 |
| **API 兼容** | ⭐⭐⭐⭐⭐ OpenAI 标准 | ⭐⭐⭐ 需要适配 |
| **模型支持** | ⭐⭐⭐⭐⭐ 广泛支持 | ⭐⭐⭐ 部分支持 |

### 🎯 实际应用场景

通过使用 vLLM，XPULink 能够为您提供：

- **高并发对话服务**：同时支持数千用户在线交互
- **实时 RAG 应用**：快速检索并生成高质量回答
- **批量内容生成**：高效处理大规模文本生成任务
- **成本优化**：相同硬件下服务更多用户，降低单次推理成本
- **稳定可靠**：久经考验的工业级推理引擎，保障服务稳定性

### 📚 了解更多

- vLLM 官方仓库：[https://github.com/vllm-project/vllm](https://github.com/vllm-project/vllm)
- vLLM 论文：[Efficient Memory Management for Large Language Model Serving with PagedAttention](https://arxiv.org/abs/2309.06180)

**通过 vLLM 的强大能力，XPULink 为您的 AI 应用提供极致性能和卓越体验！**

## 常见问题

### Q: 如何获取 API Key？
A: 访问 [www.xpulink.net](https://www.xpulink.net) 注册账号并在控制台获取您的 API Key。

### Q: 支持哪些模型？
A: 目前示例中使用了：
- 文本生成模型：`qwen3-32b`（支持 LoRA 微调）
- Embedding 模型：`bge-m3`（推荐，特别适合中文）、`text-embedding-ada-002`
更多模型请查看 XPULink 官方文档。

### Q: 什么时候需要使用 LoRA 微调？
A: 以下场景建议使用 LoRA 微调：
- 需要模型了解特定领域知识（如企业内部产品、专业术语等）
- 希望模型按特定风格或格式输出内容
- 提升模型在特定任务上的表现（如代码生成、文本摘要等）
- 需要模型遵守特定的对话规范或准则

LoRA 微调成本低、速度快，通常 50-100 个高质量训练样本即可见效。

### Q: API 请求失败怎么办？
A: 请检查：
1. API Key 是否正确配置
2. 网络连接是否正常
3. API 配额是否充足
4. 请求参数是否符合规范



