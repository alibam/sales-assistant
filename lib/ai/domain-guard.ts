/**
 * 领域防护模块 - Domain Guard
 *
 * 职责：
 * 1. detectCustomerDomain - 检测客户领域（汽车零售 vs 企业采购）
 * 2. filterCrossDomainKnowledge - 过滤跨域知识片段
 * 3. validateStrategyDomain - 验证策略领域一致性
 *
 * 这是最后一道 deterministic 防线，确保策略不会跨域污染
 */

export type CustomerDomain = 'automotive-retail' | 'enterprise-b2b' | 'unknown';

export interface KnowledgeChunk {
  content: string;
  similarity: number;
}

export interface Strategy {
  title: string;
  summary: string;
  priority: string;
  talkTracks: Array<{
    objective: string;
    script: string;
    whenToUse: string;
    tone: string;
  }>;
  actionPlan: Array<{
    step: string;
    owner: string;
    dueWindow: string;
    expectedSignal: string;
  }>;
  nextFollowUp: string;
}

export interface DomainValidationResult {
  isValid: boolean;
  violations: string[];
  domain: CustomerDomain;
}

/**
 * 检测客户领域
 *
 * 基于客户画像和 followUp 文本，判断客户属于哪个领域
 *
 * @param followUpText - 销售员的跟进原话
 * @param profileData - 客户画像数据
 * @returns 客户领域
 */
export function detectCustomerDomain(
  followUpText: string,
  profileData?: any
): CustomerDomain {
  const text = followUpText.toLowerCase();

  // 企业/B2B 关键词
  const enterpriseKeywords = [
    '企业客户',
    '公司采购',
    '对公账户',
    '额度审批',
    '三方会议',
    '产品经理',
    '技术团队',
    '招标',
    '合同审批',
    '商务车辆',
    '公司用车',
    '企业采购',
  ];

  // 汽车零售关键词
  const retailKeywords = [
    '家庭',
    '孩子',
    '二胎',
    '空间',
    '安全座椅',
    '老婆',
    '试驾',
    '到店',
    '看车',
    '豪华suv',
    '宝马x3',
    '奔驰glc',
    '后排空间',
    '家庭用车',
    '到店看现车',
  ];

  // 检查 profileData 强信号
  if (profileData) {
    const profileText = JSON.stringify(profileData).toLowerCase();

    // 强信号：家庭购车场景
    const hasRetailSignals =
      profileText.includes('二胎') ||
      profileText.includes('家庭用车') ||
      profileText.includes('后排空间') ||
      profileText.includes('安全座椅') ||
      profileText.includes('宝马x3') ||
      profileText.includes('到店看现车') ||
      profileText.includes('孩子');

    if (hasRetailSignals) {
      console.log('[Domain Guard] profileData 包含家庭购车强信号，强制收敛为 automotive-retail');
      return 'automotive-retail';
    }
  }

  // 统计关键词出现次数
  const enterpriseCount = enterpriseKeywords.filter((keyword) =>
    text.includes(keyword)
  ).length;

  const retailCount = retailKeywords.filter((keyword) =>
    text.includes(keyword)
  ).length;

  // 判断领域
  if (enterpriseCount > retailCount) {
    return 'enterprise-b2b';
  } else if (retailCount > 0) {
    return 'automotive-retail';
  } else {
    return 'unknown';
  }
}

/**
 * 过滤跨域知识片段
 *
 * 根据客户领域，过滤掉不相关的知识片段
 *
 * @param chunks - 检索到的知识片段
 * @param domain - 客户领域
 * @param similarityThreshold - 相似度阈值（默认 0.7）
 * @returns 过滤后的知识片段
 */
export function filterCrossDomainKnowledge(
  chunks: KnowledgeChunk[],
  domain: CustomerDomain,
  similarityThreshold: number = 0.7
): KnowledgeChunk[] {
  // 企业/B2B 关键词（需要过滤）
  const enterpriseKeywords = [
    '企业客户',
    '公司采购',
    '对公账户',
    '额度审批',
    '三方会议',
    '产品经理',
    '技术团队',
    '招标',
    '合同审批',
    '商务车辆',
    '公司用车',
    '企业采购',
    '增值税发票',
    '品牌形象',
    '维护成本',
    '融资',
    '贷款',
    '资金需求',
    '企业扩张',
    '营收',
    '年营收',
    '个人资产',
    '融资成本',
    '授信',
    '放款',
    '审批速度',
    '额度',
    '对公',
    '企业主融资',
    '金融方案',
    '金融专员',
  ];

  return chunks.filter((chunk) => {
    // 1. 相似度过滤
    if (chunk.similarity < similarityThreshold) {
      return false;
    }

    // 2. 领域过滤
    if (domain === 'automotive-retail') {
      // 汽车零售领域：过滤掉企业/B2B关键词
      const content = chunk.content.toLowerCase();
      const hasEnterpriseKeywords = enterpriseKeywords.some((keyword) =>
        content.includes(keyword.toLowerCase())
      );

      return !hasEnterpriseKeywords;
    } else if (domain === 'enterprise-b2b') {
      // 企业/B2B领域：保留企业相关内容
      // TODO: 如果需要，可以过滤掉家庭购车相关内容
      return true;
    } else {
      // 未知领域：保留所有内容
      return true;
    }
  });
}

/**
 * 验证策略领域一致性
 *
 * 检查生成的策略是否包含跨域关键词
 *
 * @param strategy - 生成的策略
 * @param domain - 客户领域
 * @returns 验证结果
 */
export function validateStrategyDomain(
  strategy: Strategy,
  domain: CustomerDomain
): DomainValidationResult {
  const violations: string[] = [];

  // 企业/B2B 关键词
  const enterpriseKeywords = [
    '企业客户',
    '公司采购',
    '对公账户',
    '额度审批',
    '三方会议',
    '产品经理',
    '技术团队',
    '招标',
    '合同审批',
    '商务车辆',
    '公司用车',
    '企业采购',
    '融资',
    '贷款',
    '资金需求',
    '企业扩张',
    '营收',
    '年营收',
    '个人资产',
    '融资成本',
    '授信',
    '放款',
    '审批速度',
    '额度',
    '对公',
    '企业主融资',
    '金融方案',
  ];

  // 如果是汽车零售领域，检查是否包含企业/B2B关键词
  if (domain === 'automotive-retail') {
    // 检查标题
    const titleLower = strategy.title.toLowerCase();
    enterpriseKeywords.forEach((keyword) => {
      if (titleLower.includes(keyword.toLowerCase())) {
        violations.push(`标题包含跨域关键词: ${keyword}`);
      }
    });

    // 检查摘要
    const summaryLower = strategy.summary.toLowerCase();
    enterpriseKeywords.forEach((keyword) => {
      if (summaryLower.includes(keyword.toLowerCase())) {
        violations.push(`摘要包含跨域关键词: ${keyword}`);
      }
    });

    // 检查话术
    strategy.talkTracks.forEach((track, index) => {
      const scriptLower = track.script.toLowerCase();
      enterpriseKeywords.forEach((keyword) => {
        if (scriptLower.includes(keyword.toLowerCase())) {
          violations.push(`话术 ${index + 1} 包含跨域关键词: ${keyword}`);
        }
      });
    });

    // 检查行动计划
    strategy.actionPlan.forEach((action, index) => {
      const stepLower = action.step.toLowerCase();
      enterpriseKeywords.forEach((keyword) => {
        if (stepLower.includes(keyword.toLowerCase())) {
          violations.push(`行动计划 ${index + 1} 包含跨域关键词: ${keyword}`);
        }
      });
    });

    // 检查下次跟进
    const nextFollowUpLower = strategy.nextFollowUp.toLowerCase();
    enterpriseKeywords.forEach((keyword) => {
      if (nextFollowUpLower.includes(keyword.toLowerCase())) {
        violations.push(`下次跟进包含跨域关键词: ${keyword}`);
      }
    });
  }

  return {
    isValid: violations.length === 0,
    violations,
    domain,
  };
}
