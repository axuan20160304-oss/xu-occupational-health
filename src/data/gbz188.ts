export interface GbzHazard {
  code: string;
  name: string;
  category: "化学因素" | "粉尘" | "物理因素" | "生物因素" | "特殊作业";
  checks: string[];
  cycle: string;
  contraindications: string[];
  targetDiseases: string[];
}

export const gbzCategories = [
  "化学因素",
  "粉尘",
  "物理因素",
  "生物因素",
  "特殊作业",
] as const;

export const gbzHazards: GbzHazard[] = [
  {
    code: "5.19",
    name: "苯",
    category: "化学因素",
    checks: ["血常规", "肝功能", "症状询问", "职业史评估"],
    cycle: "在岗期间每12个月1次",
    contraindications: ["造血系统疾病", "白细胞持续降低"],
    targetDiseases: ["慢性苯中毒", "血液系统异常"],
  },
  {
    code: "5.35",
    name: "甲醛",
    category: "化学因素",
    checks: ["眼鼻咽喉检查", "肺功能", "症状询问"],
    cycle: "在岗期间每12个月1次",
    contraindications: ["活动性哮喘", "严重慢性呼吸系统疾病"],
    targetDiseases: ["刺激性呼吸道损伤", "职业性哮喘"],
  },
  {
    code: "6.1",
    name: "矽尘",
    category: "粉尘",
    checks: ["胸部X线", "肺功能", "职业史与工种暴露史"],
    cycle: "在岗期间每12-24个月1次",
    contraindications: ["活动性肺结核", "严重肺功能损伤"],
    targetDiseases: ["尘肺病", "肺功能减退"],
  },
  {
    code: "6.3",
    name: "石棉粉尘",
    category: "粉尘",
    checks: ["胸部影像", "肺功能", "职业暴露史"],
    cycle: "在岗期间每12个月1次",
    contraindications: ["间质性肺疾病", "严重呼吸功能障碍"],
    targetDiseases: ["石棉肺", "胸膜病变"],
  },
  {
    code: "7.1",
    name: "噪声",
    category: "物理因素",
    checks: ["纯音测听", "耳科检查", "血压"],
    cycle: "在岗期间每12个月1次",
    contraindications: ["双耳平均听阈≥40dB", "器质性耳病"],
    targetDiseases: ["职业性噪声聋", "听力下降"],
  },
  {
    code: "7.3",
    name: "高温",
    category: "物理因素",
    checks: ["血压", "血糖", "心电图", "体格检查"],
    cycle: "在岗期间每12个月1次",
    contraindications: ["未控制高血压", "未控制糖尿病", "癫痫"],
    targetDiseases: ["中暑", "热痉挛", "热衰竭"],
  },
  {
    code: "7.2",
    name: "手传振动",
    category: "物理因素",
    checks: ["末梢循环测试", "神经系统查体", "手部功能评估"],
    cycle: "在岗期间每12个月1次",
    contraindications: ["外周神经病变", "严重雷诺现象"],
    targetDiseases: ["手臂振动病"],
  },
  {
    code: "8.1",
    name: "布鲁氏菌属",
    category: "生物因素",
    checks: ["血清学检测", "症状询问", "体格检查"],
    cycle: "在岗期间每12个月1次",
    contraindications: ["免疫缺陷状态", "慢性活动性感染"],
    targetDiseases: ["职业性布鲁氏菌病"],
  },
  {
    code: "9.1",
    name: "电工作业",
    category: "特殊作业",
    checks: ["心电图", "血压", "视力/色觉", "神经系统检查"],
    cycle: "在岗期间每12个月1次",
    contraindications: ["癫痫", "未控制2级及以上高血压", "红绿色盲"],
    targetDiseases: ["作业相关电气伤害风险"],
  },
  {
    code: "9.2",
    name: "高处作业",
    category: "特殊作业",
    checks: ["血压", "平衡功能", "心电图", "神经系统评估"],
    cycle: "在岗期间每12个月1次",
    contraindications: ["恐高症", "癫痫", "未控制高血压"],
    targetDiseases: ["高处坠落相关作业风险"],
  },
];
