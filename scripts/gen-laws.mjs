#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
const DIR = join(import.meta.dirname, '..', 'content', 'laws');
mkdirSync(DIR, { recursive: true });

const laws = [
  { slug:'workplace-hygiene-management', title:'工作场所职业卫生管理规定', date:'2025-10-01', cat:'部门规章', sum:'规范工作场所职业卫生管理，明确用人单位在职业病危害因素监测、防护设施维护、个人防护用品配备等方面的具体义务。', tags:['职业卫生','工作场所','管理规定'] },
  { slug:'hazard-declaration', title:'职业病危害项目申报办法', date:'2025-09-15', cat:'部门规章', sum:'明确用人单位职业病危害项目申报的范围、内容、程序和法律责任。', tags:['危害申报','用人单位','监管'] },
  { slug:'diagnosis-management-2021', title:'职业病诊断与鉴定管理办法（2021修订）', date:'2025-08-20', cat:'部门规章', sum:'规范职业病诊断与鉴定程序，保障劳动者获得及时准确的职业病诊断。', tags:['职业病诊断','鉴定','管理办法'] },
  { slug:'three-simultaneous', title:'建设项目职业病防护设施"三同时"监督管理办法', date:'2025-07-10', cat:'部门规章', sum:'规范建设项目职业病防护设施与主体工程同时设计、同时施工、同时投入生产和使用的要求。', tags:['三同时','建设项目','防护设施'] },
  { slug:'radiation-worker-health', title:'放射工作人员职业健康管理办法', date:'2025-06-25', cat:'部门规章', sum:'规范放射工作人员的职业健康监护，包括个人剂量监测、健康检查、防护培训等要求。', tags:['放射防护','个人剂量','健康管理'] },
  { slug:'service-institution-management', title:'职业卫生技术服务机构管理办法', date:'2025-06-01', cat:'部门规章', sum:'规范职业卫生技术服务机构的资质认定、业务范围、质量管理和监督检查。', tags:['技术服务','资质管理','质量控制'] },
  { slug:'hazard-detection-standard', title:'工作场所职业病危害因素检测规范', date:'2025-05-15', cat:'标准规范', sum:'规定工作场所空气中有害物质、粉尘、物理因素等职业病危害因素的检测方法和质量控制要求。', tags:['危害检测','采样策略','质量控制'] },
  { slug:'work-injury-insurance-od', title:'工伤保险条例中职业病相关条款解读', date:'2025-05-01', cat:'国家法律', sum:'解读工伤保险条例中与职业病认定、工伤待遇、劳动能力鉴定相关的核心条款。', tags:['工伤保险','职业病认定','待遇保障'] },
  { slug:'hazard-factor-catalog', title:'职业病危害因素分类目录（2015版）要点', date:'2025-04-20', cat:'标准规范', sum:'梳理6大类456种危害因素的分类体系，帮助用人单位准确识别和申报职业病危害。', tags:['危害因素','分类目录','因素识别'] },
  { slug:'standard-system-overview', title:'国家职业卫生标准体系概览', date:'2025-04-01', cat:'标准规范', sum:'梳理GBZ强制性标准和GBZ/T推荐性标准的分类、编号规则和主要标准清单。', tags:['标准体系','GBZ','标准分类'] },
  { slug:'health-exam-institution', title:'职业健康检查管理办法', date:'2025-03-15', cat:'部门规章', sum:'规范职业健康检查机构的资质管理、检查程序、报告出具和质量控制。', tags:['健康检查','机构管理','报告规范'] },
  { slug:'high-toxicity-catalog', title:'高毒物品目录与特殊管理要求', date:'2025-03-01', cat:'标准规范', sum:'梳理54种高毒物品及其特殊管理要求，包括作业场所管理、应急救援和劳动者特殊保护。', tags:['高毒物品','特殊管理','应急救援'] },
  { slug:'female-worker-protection', title:'女职工劳动保护特别规定中的职业健康条款', date:'2025-02-15', cat:'国家法律', sum:'解读女职工劳动保护中与职业病防治相关的条款，重点关注孕期、哺乳期特殊保护。', tags:['女职工保护','孕期保护','特殊人群'] },
  { slug:'safety-production-law-oh', title:'安全生产法中职业健康相关条款', date:'2025-02-01', cat:'国家法律', sum:'梳理安全生产法中与职业健康密切相关的条款，厘清安全生产与职业健康的法律衔接。', tags:['安全生产法','法律衔接','监管体制'] },
  { slug:'gbz-2-1-chemical-oel', title:'GBZ 2.1 化学有害因素职业接触限值要点', date:'2025-01-20', cat:'标准规范', sum:'解读MAC、PC-TWA、PC-STEL的含义和应用，列出常见化学因素限值。', tags:['接触限值','GBZ2.1','化学因素'] },
  { slug:'gbz-2-2-physical-oel', title:'GBZ 2.2 物理因素职业接触限值要点', date:'2025-01-10', cat:'标准规范', sum:'解读噪声、高温、振动等物理因素的职业接触限值标准及检测判定方法。', tags:['物理因素','噪声限值','高温限值'] },
  { slug:'od-reporting-procedure', title:'职业病报告办法与报告流程', date:'2024-12-20', cat:'部门规章', sum:'规范职业病报告的主体、内容、时限和流程，确保职业病信息的及时准确上报。', tags:['职业病报告','报告流程','信息统计'] },
  { slug:'labor-contract-od-protection', title:'劳动合同法中职业病劳动者权益保护条款', date:'2024-12-01', cat:'国家法律', sum:'解读劳动合同法中对职业病劳动者的特殊保护条款，包括合同解除限制和经济补偿。', tags:['劳动合同','权益保护','合同解除'] },
  { slug:'od-prevention-regulation', title:'职业病防治法实施条例核心条款', date:'2024-11-15', cat:'行政法规', sum:'梳理职业病防治法实施条例中的核心操作性条款，提供具体执行指引。', tags:['实施条例','操作指引','执行细则'] },
  { slug:'gbz-70-pneumoconiosis', title:'尘肺病诊断标准GBZ 70要点解读', date:'2024-11-01', cat:'标准规范', sum:'解读GBZ 70尘肺病诊断标准的核心内容，包括分期标准和影像学判定要点。', tags:['尘肺病','诊断标准','GBZ70'] },
  { slug:'gbz-49-noise-deafness', title:'职业性噪声聋诊断标准GBZ 49解读', date:'2024-10-15', cat:'标准规范', sum:'解读GBZ 49职业性噪声聋诊断标准，包括听力损失评定方法和伤残等级对应。', tags:['噪声聋','诊断标准','GBZ49'] },
  { slug:'gbz-37-lead-poisoning', title:'职业性慢性铅中毒诊断标准GBZ 37解读', date:'2024-10-01', cat:'标准规范', sum:'解读GBZ 37诊断分级、实验室指标判定和治疗原则。', tags:['铅中毒','诊断标准','GBZ37'] },
  { slug:'gbz-68-benzene-poisoning', title:'职业性苯中毒诊断标准GBZ 68解读', date:'2024-09-15', cat:'标准规范', sum:'解读GBZ 68急性和慢性苯中毒的诊断分级、血液学指标和处理原则。', tags:['苯中毒','诊断标准','GBZ68'] },
  { slug:'confined-space-protection', title:'密闭空间作业职业病危害防护规范', date:'2024-09-01', cat:'标准规范', sum:'规范密闭空间作业的危害识别、检测、防护和应急救援要求。', tags:['密闭空间','急性中毒','应急救援'] },
  { slug:'risk-classification', title:'职业病危害风险分级管控办法', date:'2024-08-15', cat:'部门规章', sum:'建立职业病危害风险分级管控体系，按照风险等级实施差异化管理。', tags:['风险分级','分级管控','差异化管理'] },
  { slug:'oh-training-regulation', title:'职业健康培训管理规定', date:'2024-08-01', cat:'部门规章', sum:'规范用人单位职业健康培训的内容、对象、学时要求和考核管理。', tags:['职业培训','安全教育','自我防护'] },
  { slug:'ppe-selection-standard', title:'个人防护用品选用与管理规范', date:'2024-07-15', cat:'标准规范', sum:'规范职业病危害场所个人防护用品的选用原则、配备标准和使用培训。', tags:['个人防护','PPE','选用标准'] },
  { slug:'emergency-rescue-plan', title:'职业病危害事故应急救援预案编制指南', date:'2024-07-01', cat:'标准规范', sum:'指导用人单位编制职业病危害事故应急救援预案，明确组织体系、处置流程和资源保障。', tags:['应急预案','事故救援','预案编制'] },
  { slug:'dust-control-technology', title:'工业企业粉尘危害治理技术规范', date:'2024-06-15', cat:'标准规范', sum:'规范工业企业粉尘危害的工程治理技术，包括通风除尘、湿式作业和密闭化改造。', tags:['粉尘治理','通风除尘','工程控制'] },
  { slug:'noise-control-standard', title:'工业企业噪声控制设计规范', date:'2024-06-01', cat:'标准规范', sum:'规范工业企业噪声控制的设计原则、隔声降噪技术和效果评价方法。', tags:['噪声控制','隔声降噪','工程设计'] },
  { slug:'chemical-safety-management', title:'使用有毒物品作业场所劳动保护条例', date:'2024-05-15', cat:'行政法规', sum:'规范使用有毒物品作业场所的劳动保护，包括作业场所管理、劳动者保护和监督检查。', tags:['有毒物品','劳动保护','作业场所'] },
  { slug:'od-classification-icd', title:'职业病与ICD编码对照及统计分析', date:'2024-05-01', cat:'标准规范', sum:'梳理我国法定职业病与国际疾病分类ICD编码的对照关系，便于统计分析和国际交流。', tags:['ICD编码','统计分析','国际对照'] },
  { slug:'occupational-health-service', title:'基本职业卫生服务规范', date:'2024-04-15', cat:'标准规范', sum:'规范基层职业卫生服务的内容、方法和质量要求，推动职业健康服务均等化。', tags:['基层服务','均等化','服务规范'] },
  { slug:'heat-stroke-prevention', title:'防暑降温措施管理办法', date:'2024-04-01', cat:'部门规章', sum:'规范高温作业和高温天气劳动保护，明确用人单位防暑降温的具体措施和劳动者权益。', tags:['防暑降温','高温作业','劳动保护'] },
  { slug:'welding-fume-protection', title:'焊接作业职业病危害防护技术规范', date:'2024-03-15', cat:'标准规范', sum:'规范焊接作业中电焊烟尘、有毒气体、紫外线等危害因素的防护技术要求。', tags:['焊接作业','电焊烟尘','防护技术'] },
  { slug:'mining-oh-regulation', title:'矿山职业健康监护管理规定', date:'2024-03-01', cat:'部门规章', sum:'针对矿山行业特点，规范矿山企业职业健康监护的特殊要求和管理措施。', tags:['矿山','健康监护','行业规定'] },
  { slug:'construction-oh-standard', title:'建筑行业职业病危害防治技术规范', date:'2024-02-15', cat:'标准规范', sum:'规范建筑施工中粉尘、噪声、振动、高温等危害因素的防治技术要求。', tags:['建筑行业','施工防护','行业标准'] },
  { slug:'electronics-oh-guide', title:'电子制造业职业病危害防治指南', date:'2024-02-01', cat:'标准规范', sum:'针对电子制造业常见的有机溶剂、铅焊烟、噪声等危害，提供系统的防治指导。', tags:['电子制造','有机溶剂','行业指南'] },
  { slug:'auto-manufacturing-oh', title:'汽车制造业职业病危害特征与防护要点', date:'2024-01-15', cat:'标准规范', sum:'分析汽车制造各工序（冲压、焊装、涂装、总装）的职业病危害特征和防护重点。', tags:['汽车制造','涂装','行业分析'] },
  { slug:'chemical-industry-oh', title:'化工行业职业病危害防治管理规范', date:'2024-01-01', cat:'标准规范', sum:'规范化工行业职业病危害的识别、评价、控制和管理，覆盖生产全流程。', tags:['化工行业','危害控制','行业管理'] },
  { slug:'textile-industry-oh', title:'纺织行业职业病危害与防护实务', date:'2023-12-15', cat:'标准规范', sum:'梳理纺织行业棉尘、噪声、高温等主要危害因素及其防护措施。', tags:['纺织行业','棉尘','行业防护'] },
  { slug:'furniture-industry-oh', title:'家具制造业职业病危害防治要点', date:'2023-12-01', cat:'标准规范', sum:'分析家具制造业木粉尘、甲醛、苯系物、噪声等危害因素的防治要点。', tags:['家具制造','木粉尘','甲醛'] },
  { slug:'battery-industry-oh', title:'蓄电池行业铅危害防治专项规范', date:'2023-11-15', cat:'标准规范', sum:'针对蓄电池行业铅危害的特殊性，规范铅烟铅尘的工程控制和个人防护要求。', tags:['蓄电池','铅危害','专项防治'] },
  { slug:'shoe-making-oh', title:'制鞋行业苯危害防治技术指南', date:'2023-11-01', cat:'标准规范', sum:'针对制鞋行业广泛使用含苯胶粘剂的现状，提供苯危害替代、工程控制和健康监护指导。', tags:['制鞋行业','苯危害','胶粘剂'] },
  { slug:'port-logistics-oh', title:'港口物流业职业病危害防治要点', date:'2023-10-15', cat:'标准规范', sum:'梳理港口装卸、仓储物流中粉尘、噪声、振动等危害因素的防治要点。', tags:['港口物流','装卸作业','行业防治'] },
];

for (const l of laws) {
  const tags = l.tags.map(t => `  - "${t}"`).join('\n');
  const safeTitle = l.title.replace(/"/g, '\\"');
  const safeSummary = l.sum.replace(/"/g, '\\"');
  const mdx = `---
title: "${safeTitle}"
date: "${l.date}"
category: "${l.cat}"
summary: "${safeSummary}"
tags:
${tags}
attachments: []
---

## 概述

${l.sum}

## 核心要点

本法规/标准的核心要点包括适用范围、主要义务、监督检查和法律责任等方面的规定。具体内容请参阅原文。

## 实务建议

1. 用人单位应认真学习并贯彻执行本法规/标准
2. 建立健全相关管理制度和操作规程
3. 定期开展自查自纠，确保合规运营
4. 关注法规标准的更新动态，及时调整管理措施
`;
  writeFileSync(join(DIR, `${l.slug}.mdx`), mdx);
}

console.log(`✅ 生成了 ${laws.length} 篇法规文件`);
