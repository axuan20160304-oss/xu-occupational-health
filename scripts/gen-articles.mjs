#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
const DIR = join(import.meta.dirname, '..', 'content', 'articles');
mkdirSync(DIR, { recursive: true });

const articles = [
  { slug:'vibration-hand-arm-syndrome', title:'手传振动危害与手臂振动病健康监护要点', date:'2026-02-08', cat:'实务指南', sum:'系统梳理手传振动作业的健康监护要点，包括振动白指的识别、冷水复温试验和岗位管理建议。', tags:['振动','手臂振动病','健康监护'] },
  { slug:'formaldehyde-exposure-management', title:'甲醛作业健康监护与岗位管理实务', date:'2026-02-03', cat:'实务指南', sum:'针对家具、建材等行业甲醛接触岗位，梳理健康监护指标、异常处置和工程控制措施。', tags:['甲醛','化学因素','岗位管理'] },
  { slug:'hexane-neuropathy-case', title:'正己烷中毒致周围神经病案例分析', date:'2026-01-28', cat:'案例分析', sum:'通过电子制造业正己烷中毒案例，分析发病过程、诊断要点和预防措施。', tags:['正己烷','周围神经病','案例'] },
  { slug:'tce-liver-injury', title:'三氯乙烯致药疹样皮炎的识别与处置', date:'2026-01-20', cat:'案例分析', sum:'解析三氯乙烯职业接触导致的药疹样皮炎的临床特征、早期识别和应急处置要点。', tags:['三氯乙烯','皮炎','急性中毒'] },
  { slug:'silicosis-staging-imaging', title:'矽肺分期影像学判读实务：从0+到III期', date:'2026-01-12', cat:'实务指南', sum:'结合典型影像学图例，详解矽肺各期的X线/CT表现特征和读片判定要点。', tags:['矽肺','影像学','分期判读'] },
  { slug:'asbestos-mesothelioma-surveillance', title:'石棉接触者长期随访与间皮瘤筛查策略', date:'2026-01-05', cat:'实务指南', sum:'梳理石棉接触者离岗后长期随访方案，重点关注间皮瘤和肺癌的早期筛查。', tags:['石棉','间皮瘤','长期随访'] },
  { slug:'mercury-poisoning-dental', title:'口腔科汞接触职业健康监护要点', date:'2025-12-28', cat:'实务指南', sum:'针对口腔科银汞合金使用场景，梳理汞蒸气接触的健康监护指标和防护措施。', tags:['汞','口腔科','健康监护'] },
  { slug:'manganese-welding-fume', title:'焊接锰烟暴露的神经毒性监护策略', date:'2025-12-20', cat:'实务指南', sum:'分析电焊作业中锰烟暴露的神经系统损害特征，提出健康监护和岗位管理建议。', tags:['锰','焊接','神经毒性'] },
  { slug:'cadmium-kidney-damage', title:'镉作业肾损害早期指标与监护实务', date:'2025-12-15', cat:'实务指南', sum:'解读镉接触导致肾小管损害的早期生物标志物（β2-微球蛋白等）及监护策略。', tags:['镉','肾损害','生物标志物'] },
  { slug:'chromium-nasal-septum', title:'铬作业鼻中隔穿孔的预防与健康监护', date:'2025-12-08', cat:'实务指南', sum:'梳理铬酸盐作业中鼻中隔穿孔的发病机制、早期识别和预防措施。', tags:['铬','鼻中隔','预防监护'] },
  { slug:'coal-worker-pneumoconiosis', title:'煤工尘肺的诊断特点与矽肺鉴别', date:'2025-12-01', cat:'实务指南', sum:'对比分析煤工尘肺与矽肺在影像学、临床表现和预后方面的差异。', tags:['煤工尘肺','矽肺','鉴别诊断'] },
  { slug:'occupational-asthma-diagnosis', title:'职业性哮喘的诊断思路与激发试验', date:'2025-11-25', cat:'实务指南', sum:'梳理职业性哮喘的诊断流程，包括职业史采集、肺功能检测和特异性激发试验。', tags:['职业性哮喘','激发试验','诊断'] },
  { slug:'radiation-dose-monitoring', title:'放射工作人员个人剂量监测实务指南', date:'2025-11-18', cat:'实务指南', sum:'详解个人剂量计的佩戴规范、监测周期、数据分析和超剂量处理流程。', tags:['放射','剂量监测','防护'] },
  { slug:'shift-work-health-effects', title:'轮班作业对健康的影响及监护建议', date:'2025-11-10', cat:'实务指南', sum:'综述轮班作业对心血管、代谢、睡眠等系统的健康影响，提出针对性监护建议。', tags:['轮班作业','睡眠障碍','健康影响'] },
  { slug:'vdt-work-health-guide', title:'视屏显示终端（VDT）作业健康管理指南', date:'2025-11-01', cat:'实务指南', sum:'梳理长期视屏作业对视力、颈椎、腕部的影响及预防措施。', tags:['VDT作业','视力保护','颈椎'] },
  { slug:'high-altitude-work-medical', title:'高处作业人员健康检查要点与禁忌证', date:'2025-10-25', cat:'实务指南', sum:'解读高处作业特殊健康检查的项目、禁忌证判定和岗位适应性评估。', tags:['高处作业','禁忌证','适应性评估'] },
  { slug:'driver-health-exam', title:'职业驾驶员健康检查要点与常见问题', date:'2025-10-18', cat:'实务指南', sum:'梳理职业驾驶员健康检查的特殊要求，包括视力、听力、心血管和神经系统评估。', tags:['驾驶员','健康检查','特殊作业'] },
  { slug:'electrician-health-exam', title:'电工作业人员健康检查与禁忌证判定', date:'2025-10-10', cat:'实务指南', sum:'解读电工作业健康检查的项目设置、禁忌证标准和岗位适应性评估要点。', tags:['电工','禁忌证','特殊作业'] },
  { slug:'compressed-air-decompression', title:'高气压作业减压病的预防与健康监护', date:'2025-10-01', cat:'实务指南', sum:'梳理潜水、沉箱等高气压作业中减压病的发病机制、预防措施和健康监护要求。', tags:['高气压','减压病','潜水'] },
  { slug:'biological-hazard-brucella', title:'布鲁氏菌病职业感染的防护与监护', date:'2025-09-25', cat:'实务指南', sum:'针对畜牧、屠宰等行业布鲁氏菌职业感染风险，梳理防护措施和健康监护要点。', tags:['布鲁氏菌','生物因素','职业感染'] },
  { slug:'anthrax-occupational-prevention', title:'职业性炭疽的预防与应急处置', date:'2025-09-18', cat:'实务指南', sum:'梳理皮毛加工等行业炭疽职业感染的预防措施、早期识别和应急处置流程。', tags:['炭疽','生物因素','应急处置'] },
  { slug:'occupational-skin-disease', title:'职业性皮肤病的分类识别与防护策略', date:'2025-09-10', cat:'实务指南', sum:'系统梳理接触性皮炎、光接触性皮炎、化学性皮肤灼伤等职业性皮肤病的识别和防护。', tags:['皮肤病','接触性皮炎','防护'] },
  { slug:'occupational-eye-disease', title:'职业性眼病的预防与紧急处理', date:'2025-09-01', cat:'实务指南', sum:'梳理化学性眼灼伤、电光性眼炎等职业性眼病的预防措施和现场紧急处理方法。', tags:['眼病','电光性眼炎','紧急处理'] },
  { slug:'hearing-conservation-program', title:'企业听力保护计划的建立与实施', date:'2025-08-25', cat:'实务指南', sum:'指导企业建立系统的听力保护计划，包括噪声监测、听力测试、防护用品和培训教育。', tags:['听力保护','噪声管理','企业计划'] },
  { slug:'respiratory-protection-program', title:'呼吸防护计划的制定与执行要点', date:'2025-08-18', cat:'实务指南', sum:'指导企业制定呼吸防护计划，包括危害评估、防护用品选择、适合性测试和培训。', tags:['呼吸防护','防护计划','适合性测试'] },
  { slug:'ergonomics-workplace-design', title:'工效学在职业健康中的应用：工位设计与肌骨预防', date:'2025-08-10', cat:'实务指南', sum:'介绍工效学原理在工位设计中的应用，预防职业性肌肉骨骼疾病。', tags:['工效学','工位设计','肌骨预防'] },
  { slug:'mental-health-workplace', title:'职业心理健康：从压力管理到EAP实施', date:'2025-08-01', cat:'实务指南', sum:'梳理职业心理健康管理的框架，包括压力识别、心理援助计划（EAP）和组织干预。', tags:['心理健康','EAP','压力管理'] },
  { slug:'occupational-cancer-surveillance', title:'职业性肿瘤的监测与早期筛查策略', date:'2025-07-25', cat:'实务指南', sum:'梳理石棉致肺癌、苯致白血病等职业性肿瘤的高危人群识别和早期筛查方案。', tags:['职业性肿瘤','早期筛查','高危人群'] },
  { slug:'return-to-work-assessment', title:'职业病康复后复工评估流程与要点', date:'2025-07-18', cat:'实务指南', sum:'建立职业病劳动者康复后复工的医学评估流程，包括功能评定、岗位匹配和随访管理。', tags:['复工评估','康复','岗位匹配'] },
  { slug:'oh-information-system', title:'职业健康信息化管理系统建设指南', date:'2025-07-10', cat:'实务指南', sum:'指导企业和体检机构建设职业健康信息化管理系统，实现数据采集、分析和预警。', tags:['信息化','管理系统','数据分析'] },
  { slug:'annual-oh-report-writing', title:'年度职业健康监护汇总报告撰写指南', date:'2025-07-01', cat:'实务指南', sum:'指导体检机构撰写年度职业健康监护汇总报告，包括数据统计、趋势分析和改进建议。', tags:['汇总报告','数据统计','报告撰写'] },
  { slug:'oh-audit-checklist', title:'职业卫生合规审计清单与常见问题', date:'2025-06-25', cat:'实务指南', sum:'提供用人单位职业卫生合规审计的完整清单，梳理常见不合规问题和整改建议。', tags:['合规审计','清单','整改建议'] },
  { slug:'emergency-drill-design', title:'职业病危害事故应急演练设计与评估', date:'2025-06-18', cat:'实务指南', sum:'指导企业设计和实施职业病危害事故应急演练，包括情景设置、流程设计和效果评估。', tags:['应急演练','情景设计','效果评估'] },
  { slug:'contractor-oh-management', title:'承包商职业健康管理：甲方的监管责任', date:'2025-06-10', cat:'实务指南', sum:'梳理发包方对承包商职业健康管理的监管责任和实务操作要点。', tags:['承包商','监管责任','管理实务'] },
  { slug:'new-employee-oh-onboarding', title:'新员工职业健康入职流程设计', date:'2025-06-01', cat:'实务指南', sum:'设计新员工入职的职业健康管理流程，包括上岗前体检、危害告知、培训和防护用品发放。', tags:['新员工','入职流程','上岗前'] },
  { slug:'oh-kpi-metrics', title:'职业健康管理绩效指标体系设计', date:'2025-05-25', cat:'实务指南', sum:'建立职业健康管理的关键绩效指标（KPI）体系，用于评估和持续改进职业健康管理水平。', tags:['KPI','绩效指标','持续改进'] },
  { slug:'dust-ai-chest-xray', title:'AI辅助胸片读片在尘肺筛查中的应用前景', date:'2025-05-18', cat:'实务指南', sum:'探讨人工智能辅助胸片读片技术在尘肺病筛查中的应用现状、优势和局限性。', tags:['AI','胸片读片','尘肺筛查'] },
  { slug:'wearable-exposure-monitoring', title:'可穿戴设备在职业暴露监测中的应用', date:'2025-05-10', cat:'实务指南', sum:'介绍可穿戴传感器在噪声、粉尘、有毒气体等职业暴露实时监测中的应用前景。', tags:['可穿戴','实时监测','新技术'] },
  { slug:'telemedicine-oh-service', title:'远程医疗在职业健康服务中的实践', date:'2025-05-01', cat:'实务指南', sum:'探讨远程医疗技术在职业健康咨询、远程读片、专家会诊等场景中的应用。', tags:['远程医疗','数字化','服务创新'] },
  { slug:'green-chemistry-substitution', title:'绿色化学替代：从源头消除职业病危害', date:'2025-04-25', cat:'实务指南', sum:'介绍通过化学品替代策略从源头消除或降低职业病危害的案例和方法。', tags:['绿色化学','替代策略','源头控制'] },
  { slug:'total-worker-health', title:'全面职工健康（TWH）理念与实践', date:'2025-04-18', cat:'实务指南', sum:'介绍美国NIOSH提出的全面职工健康理念，整合职业安全健康与健康促进。', tags:['TWH','健康促进','综合管理'] },
  { slug:'iso-45001-oh-integration', title:'ISO 45001体系中职业健康管理的整合', date:'2025-04-10', cat:'实务指南', sum:'解读ISO 45001职业健康安全管理体系中职业健康管理的要求和实施要点。', tags:['ISO45001','管理体系','体系整合'] },
  { slug:'small-enterprise-oh-guide', title:'中小企业职业健康管理简明指南', date:'2025-04-01', cat:'实务指南', sum:'为资源有限的中小企业提供简明实用的职业健康管理指南，聚焦核心合规要求。', tags:['中小企业','简明指南','合规'] },
  { slug:'oh-cost-benefit-analysis', title:'职业健康投入的成本效益分析方法', date:'2025-03-25', cat:'实务指南', sum:'介绍职业健康投入的经济学分析方法，帮助企业理解预防投入的长期回报。', tags:['成本效益','经济分析','投资回报'] },
];

for (const a of articles) {
  const tags = a.tags.map(t => `  - "${t}"`).join('\n');
  const mdx = `---
title: "${a.title}"
date: "${a.date}"
category: "${a.cat}"
summary: "${a.sum}"
tags:
${tags}
attachments: []
---

## 概述

${a.sum}

## 核心要点

本文围绕${a.title}展开，从理论基础、实务操作和案例分析三个维度进行系统梳理。

## 实务建议

1. 结合本单位实际情况，制定针对性的管理方案
2. 加强相关人员的专业培训和技能提升
3. 建立持续改进机制，定期评估和优化管理措施
4. 关注行业最新动态和技术发展，及时更新知识体系
`;
  writeFileSync(join(DIR, `${a.slug}.mdx`), mdx);
}

console.log(`✅ 生成了 ${articles.length} 篇文章`);
