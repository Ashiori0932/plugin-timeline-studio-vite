# 插件式时序展示编辑器（纯 Vite 版）

这是一个完全独立于部署平台的 React + TypeScript + Vite 静态网页项目。它通过 JSON 数据驱动文本、图片和图表组件，并在展示模式中按照时间轴循环切换数据对象。

项目不包含 Next.js、Vinext、Cloudflare Worker、Sites、D1、Drizzle 或登录功能。

## 运行环境

- Node.js `>= 22.13.0`
- npm `>= 10`

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

构建结果位于 `dist/`，可以部署到 Nginx、GitHub Pages、对象存储或任意静态服务器。

## 项目结构

```text
src/
├── App.tsx                         # 项目状态、自动保存及模式切换
├── main.tsx                        # React 入口
├── core/
│   ├── bindings.ts                 # JSON 字段解析和类型匹配
│   └── project.ts                  # 默认项目、导入及校验
├── editor/
│   ├── EditorApp.tsx               # 编辑器状态和业务协调
│   ├── EditorCanvas.tsx            # 画布、拖动、缩放和网格吸附
│   ├── ComponentPalette.tsx        # 插件库和图层面板
│   ├── PropertyInspector.tsx       # 数据绑定和属性编辑
│   ├── TimelinePanel.tsx           # 静态时间轴预览
│   ├── TopBar.tsx                  # 导入、导出及展示入口
│   └── ui.tsx                      # 通用表单控件
├── plugins/
│   └── registry.tsx                # 插件注册表及内置插件
├── runtime/
│   └── PresentationRuntime.tsx     # 播放、暂停和循环展示
├── styles/
│   └── index.css                   # 完整界面样式
└── types/
    └── project.ts                  # 项目和插件类型定义
```

## JSON 数据格式

导入数据时可以直接使用对象数组，也可以使用带 `items` 的对象：

```json
{
  "items": [
    {
      "id": "item-001",
      "duration": 6000,
      "title": "第一组数据",
      "description": "展示文本",
      "image": "./assets/image-01.jpg",
      "statistics": {
        "sales": 1280,
        "growth": 18
      }
    }
  ]
}
```

- `duration` 单位为毫秒。
- 单项未设置 `duration` 时使用时间轴默认时长。
- 支持嵌套字段绑定，例如 `statistics.sales`。
- `examples/sample-data.json` 提供了可直接导入的示例。

## 插件扩展方式

插件定义位于 `src/plugins/registry.tsx`。每个插件声明：

- 唯一的 `type`。
- 可接受的 JSON 数据类型 `acceptedTypes`。
- 默认尺寸和默认属性。
- 属性编辑器结构 `propertySchema`。
- 组件渲染函数 `render`。

插件注册后，编辑器会自动将数据字段、属性面板、组件创建和时间轴更新接入现有系统，不需要修改画布或展示运行时。

## 快捷操作

- `方向键`：按网格大小移动所选组件。
- `Delete` / `Backspace`：删除所选组件。
- 拖动时按住 `Alt`：暂时关闭网格吸附。
- 展示模式按 `Esc`：返回编辑模式。
