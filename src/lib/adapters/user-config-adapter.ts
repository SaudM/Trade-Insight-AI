/**
 * 用户配置适配器
 * 负责读写用户的个性化配置（初始资金、货币、图表偏好等），封装Prisma访问逻辑。
 */
import { prisma } from '@/lib/db';

export type UserConfigDTO = {
  id: string;
  userId: string;
  initialCapital: number;
  currency: string;
  chartPreferences?: Record<string, any> | null;
};

/**
 * 将数据库返回的配置记录标准化为DTO。
 * 兼容历史与当前两类模型：
 * 1) 强类型模型（包含 initialCapital、currency、chartPreferences 字段）
 * 2) 旧版键值模型（可能包含 configType、configKey、configValue 等），此时回退到默认值或解析数值。
 * @param config 任意形态的数据库返回对象
 * @returns 统一的用户配置DTO
 */
function mapToDTO(config: any): UserConfigDTO {
  const id = config?.id ?? '';
  const userId = config?.userId ?? '';

  // 优先读取强类型字段，否则尝试从可能的键值对中解析或使用默认值
  const capitalSource = typeof config?.initialCapital !== 'undefined'
    ? config.initialCapital
    : config?.configValue;
  const parsedCapital = Number(capitalSource);
  const initialCapital = Number.isFinite(parsedCapital) && parsedCapital >= 0 ? Math.round(parsedCapital) : 100000;

  const currency = typeof config?.currency === 'string' && config.currency.length > 0 ? config.currency : 'CNY';
  const chartPreferences = typeof config?.chartPreferences !== 'undefined' ? config.chartPreferences : null;

  return { id, userId, initialCapital, currency, chartPreferences };
}

/**
 * UserConfigAdapter
 * 提供获取或创建默认配置、更新初始资金、获取配置的功能。
 */
export class UserConfigAdapter {
  /**
   * 根据userId获取用户配置；如果不存在则创建默认配置。
   * @param userId 用户ID（系统UID）
   * @returns 用户配置DTO
   */
  static async getOrCreateByUserId(userId: string): Promise<UserConfigDTO> {
    // 由于历史模型的唯一键可能不是 userId，避免使用 where: { userId } 的 upsert。
    // 改为先查找，再创建，确保类型兼容并消除TS唯一输入类型报错。
    const existing = await prisma.userConfig.findFirst({ where: { userId } });
    if (existing) {
      return mapToDTO(existing as any);
    }
    const created = await prisma.userConfig.create({
      // 由于历史Prisma类型与当前表结构可能不一致，这里显式使用 any 断言以避免类型报错。
      data: {
        userId,
        initialCapital: 100000,
        currency: 'CNY',
      } as any,
    });
    return mapToDTO(created as any);
  }

  /**
   * 仅获取用户配置，不存在则返回null。
   * @param userId 用户ID（系统UID）
   * @returns 用户配置或null
   */
  static async getByUserId(userId: string): Promise<UserConfigDTO | null> {
    // 使用 findFirst 以兼容历史唯一键不为 userId 的情况，避免类型错误。
    const config = await prisma.userConfig.findFirst({ where: { userId } });
    if (!config) return null;
    return mapToDTO(config as any);
  }

  /**
   * 更新用户的初始资金。
   * @param userId 用户ID（系统UID）
   * @param initialCapital 初始资金整数（单位：元）
   * @returns 更新后的配置DTO
   */
  static async updateInitialCapital(userId: string, initialCapital: number): Promise<UserConfigDTO> {
    // 先通过 userId 查询记录，若存在则按 id 更新，否则创建。
    const existing = await prisma.userConfig.findFirst({ where: { userId } });
    if (existing) {
      const updated = await prisma.userConfig.update({
        where: { id: (existing as any).id },
        // 兼容旧版类型：更新数据使用 any 断言，避免“unknown property”类型问题。
        data: { initialCapital } as any,
      });
      return mapToDTO(updated as any);
    }
    const created = await prisma.userConfig.create({
      // 兼容旧版类型：创建数据使用 any 断言。
      data: { userId, initialCapital, currency: 'CNY' } as any,
    });
    return mapToDTO(created as any);
  }
}