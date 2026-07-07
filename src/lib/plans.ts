/**
 * 会员套餐统一定价源（前端展示 + 服务端校验共用）。
 *
 * 定价逻辑（2026-07 重定价）：
 * - 产品核心价值 = 两个量化策略实盘信号（生产 1y 年化 +37%/+47%，夏普 1.5~1.9）
 *   + AI 交易日志分析。对 10w 级跟单资金，年化超额价值远超千元，定价捕获其一小部分。
 * - 月度定高价做锚点，主推半年/年付锁定现金流（做流水优先预收款）。
 * - 服务端必须用此表校验订单金额，禁止信任客户端传价。
 */

export type PlanId = 'monthly' | 'quarterly' | 'semi_annually' | 'annually';

export interface PlanDef {
  id: PlanId;
  name: string;
  duration: string;
  /** 应付价（元）。服务端下单校验以此为准。 */
  price: number;
  /** 划线锚点价（元） */
  originalPrice: number;
  pricePerMonth?: number;
  discount: string;
  days: number;
  features: string[];
  isPopular?: boolean;
}

export const PLANS: Record<PlanId, PlanDef> = {
  monthly: {
    id: 'monthly',
    name: '月度会员',
    duration: '/月',
    price: 39,
    originalPrice: 78,
    discount: '灵活体验',
    days: 30,
    features: [
      '两大量化策略实时调仓信号',
      '策略持仓 / 交易记录全透明',
      '无限次 AI 交易分析报告',
      '数据云同步',
    ],
  },
  quarterly: {
    id: 'quarterly',
    name: '季度会员',
    duration: '/季',
    price: 99,
    originalPrice: 234,
    pricePerMonth: 33,
    discount: '省 15%',
    days: 90,
    features: [
      '两大量化策略实时调仓信号',
      '策略持仓 / 交易记录全透明',
      '无限次 AI 交易分析报告',
      '数据云同步',
    ],
  },
  semi_annually: {
    id: 'semi_annually',
    name: '半年会员',
    duration: '/半年',
    price: 169,
    originalPrice: 468,
    pricePerMonth: 28.2,
    discount: '最受欢迎',
    days: 180,
    features: [
      '两大量化策略实时调仓信号',
      '策略持仓 / 交易记录全透明',
      '无限次 AI 交易分析报告',
      '体制状态 / 仓位水平监控',
      '数据云同步',
    ],
    isPopular: true,
  },
  annually: {
    id: 'annually',
    name: '年度会员',
    duration: '/年',
    price: 299,
    originalPrice: 936,
    pricePerMonth: 24.9,
    discount: '最佳性价比',
    days: 365,
    features: [
      '两大量化策略实时调仓信号',
      '策略持仓 / 交易记录全透明',
      '无限次 AI 交易分析报告',
      '体制状态 / 仓位水平监控',
      '优先客服支持 & 新功能尝鲜',
      '数据云同步',
    ],
  },
};

export const PLAN_LIST: PlanDef[] = [
  PLANS.monthly,
  PLANS.quarterly,
  PLANS.semi_annually,
  PLANS.annually,
];

export function isValidPlanId(id: string): id is PlanId {
  return id in PLANS;
}

/** 服务端订单金额校验：允许 ±0.01 元的浮点误差 */
export function isValidPlanPrice(planId: string, price: number): boolean {
  if (!isValidPlanId(planId)) return false;
  return Math.abs(PLANS[planId].price - price) < 0.011;
}

/** 新用户免费试用天数（原 30 天 → 7 天：试用期过长压制付费转化） */
export const TRIAL_DAYS = 7;
