import type { DataItem, ProjectDocument } from "../types/project";

/** 创建首次启动和缓存损坏时使用的完整示例项目。 */
export function createDefaultProject(): ProjectDocument {
  return {
    version: 1,
    name: "2026 产业观察",
    canvas: { width: 1600, height: 900, gridSize: 8, background: "#eef0e8" },
    timeline: { defaultDuration: 8000, transitionDuration: 400, loop: true },
    // 十个对象具有相同字段结构，用于演示时间轴切换、滚轮滚动和拖拽浏览。
    items: [
      {
        id: "manufacturing",
        duration: 8000,
        eyebrow: "INDUSTRY PULSE · 01",
        title: "先进制造正在重写增长曲线",
        description: "从自动化产线到工业视觉，关键技术的渗透率持续提高。数据不只是结论，也正在成为新的生产资料。",
        image: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=1400&q=85",
        metrics: { 工业视觉: 84, 智能装备: 71, 数字孪生: 62, 柔性制造: 54 },
      },
      {
        id: "energy",
        duration: 6500,
        eyebrow: "INDUSTRY PULSE · 02",
        title: "能源系统进入精细调度时代",
        description: "更密集的感知节点、更及时的预测模型和更灵活的储能设施，正在共同改变能源网络的运行方式。",
        image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1400&q=85",
        metrics: { 储能系统: 78, 智能电网: 69, 新型材料: 58, 能耗管理: 47 },
      },
      {
        id: "city",
        duration: 9200,
        eyebrow: "INDUSTRY PULSE · 03",
        title: "城市基础设施开始实时响应",
        description: "交通、建筑与公共服务正被纳入同一套动态反馈体系，让城市从被动维护走向主动预判。",
        image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=85",
        metrics: { 城市感知: 88, 交通优化: 74, 建筑节能: 61, 公共服务: 56 },
      },
      {
        id: "healthcare",
        duration: 7600,
        eyebrow: "INDUSTRY PULSE · 04",
        title: "医疗服务从单点诊断走向连续照护",
        description: "可穿戴设备、远程随访和辅助诊断模型让医疗服务延伸到院外，形成更完整的健康数据闭环。",
        image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1400&q=85",
        metrics: { 远程诊疗: 82, 辅助诊断: 73, 慢病管理: 66, 医疗协同: 52 },
      },
      {
        id: "logistics",
        duration: 7000,
        eyebrow: "INDUSTRY PULSE · 05",
        title: "物流网络正在变成预测型系统",
        description: "仓配节点、车队调度和末端履约被实时数据串联，供应链开始提前感知需求波动。",
        image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=85",
        metrics: { 智能仓储: 79, 路径优化: 68, 需求预测: 63, 末端履约: 57 },
      },
      {
        id: "finance",
        duration: 8400,
        eyebrow: "INDUSTRY PULSE · 06",
        title: "金融风控进入实时决策阶段",
        description: "交易行为、企业经营和宏观信号被持续建模，风险识别从事后复盘转向即时干预。",
        image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=85",
        metrics: { 实时风控: 86, 智能投研: 70, 合规监测: 64, 客户洞察: 55 },
      },
      {
        id: "agriculture",
        duration: 7800,
        eyebrow: "INDUSTRY PULSE · 07",
        title: "农业生产被精细化数据重新组织",
        description: "土壤、气象和作物生长状态被持续采集，农事决策逐步从经验判断转向模型辅助。",
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=85",
        metrics: { 精准灌溉: 77, 作物监测: 69, 农机协同: 58, 产量预测: 53 },
      },
      {
        id: "education",
        duration: 6800,
        eyebrow: "INDUSTRY PULSE · 08",
        title: "教育内容开始适配个人学习节奏",
        description: "学习行为数据让课程推荐、练习反馈和能力评估更加细粒度，教学过程更强调动态调整。",
        image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=85",
        metrics: { 个性学习: 81, 课堂反馈: 72, 内容生成: 60, 能力评估: 54 },
      },
      {
        id: "retail",
        duration: 7300,
        eyebrow: "INDUSTRY PULSE · 09",
        title: "零售体验围绕实时需求重构",
        description: "门店、货架和线上触点的数据被统一分析，品牌可以更快响应消费偏好变化。",
        image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=85",
        metrics: { 智能补货: 83, 会员洞察: 75, 门店运营: 67, 全渠道协同: 59 },
      },
      {
        id: "culture",
        duration: 8800,
        eyebrow: "INDUSTRY PULSE · 10",
        title: "文化内容生产进入多模态协作",
        description: "影像、文本和互动体验的生产链路被工具化，创意团队可以更快完成概念验证与迭代。",
        image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85",
        metrics: { 内容生成: 85, 互动体验: 71, 版权管理: 62, 社群运营: 58 },
      },
    ],
    // 组件只保存字段绑定与布局；具体内容始终来自当前时间轴对象。
    components: [
      { id: "hero-image", pluginType: "builtin.image", binding: "image", x: 840, y: 56, width: 704, height: 788, zIndex: 1, properties: { fit: "cover", radius: 8, overlay: 18 } },
      { id: "eyebrow", pluginType: "builtin.text", binding: "eyebrow", x: 72, y: 88, width: 650, height: 48, zIndex: 2, properties: { fontSize: 18, color: "#607165", weight: "700", align: "left", letterSpacing: 3 } },
      { id: "hero-title", pluginType: "builtin.text", binding: "title", x: 72, y: 176, width: 680, height: 230, zIndex: 3, properties: { fontSize: 72, color: "#17211d", weight: "700", align: "left", letterSpacing: -3 } },
      { id: "description", pluginType: "builtin.text", binding: "description", x: 76, y: 438, width: 630, height: 112, zIndex: 4, properties: { fontSize: 22, color: "#58615c", weight: "400", align: "left", letterSpacing: 0 } },
      { id: "metrics", pluginType: "builtin.chart", binding: "metrics", x: 72, y: 626, width: 680, height: 190, zIndex: 5, properties: { accent: "#ee6b4d", labelColor: "#33413a", barColor: "#d9ded5", maxItems: 4 } },
    ],
  };
}

/**
 * 规范化仅包含业务数据的 JSON。
 * 同时支持直接传入对象数组，或传入 `{ items: [...] }` 包装结构。
 */
export function normalizeImportedData(input: unknown): DataItem[] {
  const candidate = Array.isArray(input)
    ? input
    : input && typeof input === "object"
      ? (input as Record<string, unknown>).items
      : null;

  if (!Array.isArray(candidate) || candidate.length === 0) {
    throw new Error("JSON 必须包含非空的 items 数组，或直接使用对象数组");
  }
  if (candidate.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error("items 中的每一项都必须是对象");
  }

  const items = candidate as DataItem[];
  // duration 会直接参与除法和 requestAnimationFrame 计时，因此在入口处排除非法值。
  items.forEach((item, index) => {
    if (item.duration !== undefined && (typeof item.duration !== "number" || item.duration < 100)) {
      throw new Error(`第 ${index + 1} 项的 duration 必须是不小于 100 的数字`);
    }
  });
  return items;
}

/**
 * 校验完整项目文件的版本和必要顶层结构。
 * 业务 items 继续复用 normalizeImportedData，保证“导入数据”和“打开项目”规则一致。
 */
export function normalizeProject(input: unknown): ProjectDocument {
  if (!input || typeof input !== "object") throw new Error("项目文件格式无效");
  const project = input as Partial<ProjectDocument>;
  if (project.version !== 1 || !project.canvas || !project.timeline || !Array.isArray(project.components)) {
    throw new Error("项目文件缺少必要配置或版本不受支持");
  }
  return { ...project, items: normalizeImportedData(project.items) } as ProjectDocument;
}
