# XPULINK AI 模型 API 快速开始指南

本指南将帮助您快速开始使用 XPULINK AI 平台的云端模型 API。我们将使用 Python 和 requests 库来调用 qwen3-32b 模型。

## 前置要求

- Python 3.7+
- requests 库 (`pip install requests`)
- XPULINK AI 平台账号和 API Key

## 配置步骤

### 1. 获取 API Key
1. 登录 XPULINK AI 平台 (https://www.xpulink.ai)
2. 在用户中心获取您的 API Key
3. 将 API Key 设置为环境变量

### 2. 设置环境变量
```bash
# Linux/Mac
export XPULINK_API_KEY="your_api_key_here"

# Windows
set XPULINK_API_KEY=your_api_key_here
```

### 3. 模型信息
- **模型名称**: qwen3-32b
- **接口地址**: https://www.xpulink.ai/v1/chat/completions
- **请求方式**: POST
- **认证方式**: Bearer Token

## 完整代码示例

以下代码演示了如何调用 XPULINK AI 的云端模型进行对话：

```python
import os
import requests

# 从环境变量读取 API Key
API_KEY = os.getenv("XPULINK_API_KEY")
if not API_KEY:
    raise ValueError("请在环境变量中设置 XPULINK_API_KEY")

# 云端模型接口信息
MODEL_NAME = "qwen3-32b"
BASE_URL = "https://www.xpulink.ai/v1/chat/completions"

# 构造请求头
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# 构造请求体
payload = {
    "model": MODEL_NAME,
    "messages": [
        {"role": "user", "content": "你好，请简单介绍一下你自己。"}
    ],
    "max_tokens": 50,
    "temperature": 0.7
}

# 发送请求并打印结果
try:
    response = requests.post(BASE_URL, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    result = response.json()
    print("模型返回内容：", result["choices"][0]["message"]["content"])
    print("测试通过！云端模型可正常跑通。")
except Exception as e:
    print("测试失败：", e)
```

## 参数说明

### 请求参数
- `model`: 模型名称，这里使用 "qwen3-32b"
- `messages`: 对话消息数组，包含角色(role)和内容(content)
- `max_tokens`: 最大生成令牌数，控制回复长度
- `temperature`: 温度参数，控制生成随机性(0-1)，值越大越随机

### 响应格式
成功响应将返回 JSON 格式的数据，主要字段包括：
- `choices[0].message.content`: 模型生成的回复内容
- `usage`: 令牌使用情况统计
- `model`: 使用的模型名称

## 运行测试

保存代码为 `test_xpulink.py` 并运行：

```bash
python test_xpulink.py
```

如果配置正确，您将看到模型的自我介绍回复和成功提示。

## 故障排除

### 常见错误
1. **API Key 错误**: 确保环境变量设置正确
2. **网络超时**: 检查网络连接，或增加 timeout 值
3. **权限错误**: 确认 API Key 有效且有足够配额

### 调试建议
- 打印完整的错误信息以获取更多详情
- 使用 curl 命令测试 API 连通性
- 检查 XPULINK 平台状态页面

## 扩展使用

基于这个基础示例，您可以：
- 修改 `messages` 内容进行多轮对话
- 调整 `temperature` 参数控制回复风格
- 增加 `system` 角色消息设置系统提示
- 添加更多请求参数如 `top_p`、`frequency_penalty` 等
