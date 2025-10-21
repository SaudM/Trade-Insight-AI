/**
 * 服务器端订阅工具函数
 * 这些函数可以在服务器端安全使用，不依赖客户端环境
 */

import type { PlanId } from '@prisma/client';

/**
 * 计算套餐对应的天数（服务器端版本）
 * @param planId 套餐ID
 * @returns 套餐天数
 */
export function calcPlanDays(planId: PlanId): number {
  switch (planId) {
    case 'monthly':
      return 30;
    case 'quarterly':
      return 90;
    case 'semi_annually':
      return 180;
    case 'annually':
      return 365;
    default:
      return 30;
  }
}

/**
 * 计算套餐到期时间（从指定开始时间）（服务器端版本）
 * @param planId 套餐ID
 * @param start 开始时间
 * @returns 到期时间
 */
export function calcExpireDate(planId: PlanId, start: Date): Date {
  const d = new Date(start);
  const days = calcPlanDays(planId);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * 获取套餐名称（服务器端版本）
 * @param planId 套餐ID
 * @returns 套餐名称
 */
export function getPlanName(planId: PlanId): string {
  switch (planId) {
    case 'monthly':
      return '月度会员';
    case 'quarterly':
      return '季度会员';
    case 'semi_annually':
      return '半年会员';
    case 'annually':
      return '年度会员';
    default:
      return '月度会员';
  }
}

/**
 * 获取套餐价格（服务器端版本）
 * @param planId 套餐ID
 * @returns 套餐价格（元）
 */
export function getPlanPrice(planId: PlanId): number {
  switch (planId) {
    case 'monthly':
      return 29.9;
    case 'quarterly':
      return 79.9;
    case 'semi_annually':
      return 149.9;
    case 'annually':
      return 299.9;
    default:
      return 29.9;
  }
}