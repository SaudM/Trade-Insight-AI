/**
 * 预设数据服务
 * 为新注册用户生成示例交易笔记和日分析报告
 */

import { prisma } from '@/lib/db';
import type { TradeLog, DailyAnalysis } from '@/lib/types';

/**
 * 预设交易笔记模板数据
 * 提供一个完整的交易示例，展示系统的功能和数据结构
 */
export const PRESET_TRADE_NOTE_TEMPLATE = {
  symbol: 'AAPL',
  direction: 'Buy' as const,
  positionSize: '100股',
  entryReason: '技术分析显示AAPL突破关键阻力位，成交量放大，RSI指标显示超卖反弹信号。同时公司即将发布新产品，市场预期积极。',
  exitReason: '达到预设止盈目标，技术指标显示短期超买，决定获利了结。',
  tradeResult: '850',
  mindsetState: '交易前心态平静，严格按照交易计划执行。看到盈利时保持冷静，没有贪婪情绪，按计划止盈。',
  lessonsLearned: '1. 严格执行交易计划的重要性\n2. 技术分析与基本面分析结合效果更好\n3. 情绪控制是成功交易的关键\n4. 及时止盈避免了后续回调的风险'
};

/**
 * 预设日分析报告模板数据
 * 基于预设交易笔记生成的分析报告示例
 */
export const PRESET_DAILY_ANALYSIS_TEMPLATE = {
  summary: '今日完成1笔AAPL交易，严格按照交易计划执行，成功获利850元。交易过程中保持良好心态，技术分析判断准确，及时止盈表现出色。',
  strengths: '1. 交易纪律性强，严格按照预设计划执行\n2. 技术分析能力较好，准确识别突破信号\n3. 情绪控制良好，没有因盈利而产生贪婪\n4. 风险管理到位，及时止盈避免回调风险',
  weaknesses: '1. 交易频次较低，可以适当增加交易机会\n2. 可以考虑分批建仓和分批止盈策略\n3. 需要加强对市场整体趋势的把握',
  emotionalImpact: '交易过程中情绪稳定，没有受到市场波动影响。盈利后保持冷静，没有过度兴奋。整体心理状态健康，有利于长期交易发展。',
  improvementSuggestions: '1. 建议制定更详细的交易计划，包括多个价位的止盈策略\n2. 可以学习更多技术指标的组合使用\n3. 建议记录更多市场观察，提高对趋势的敏感度\n4. 考虑建立交易日志模板，标准化记录过程'
};

/**
 * 预设数据服务类
 * 提供创建预设交易笔记和日分析报告的方法
 */
export class PresetDataService {
  /**
   * 为新用户创建预设交易笔记
   * @param userId 用户ID
   * @returns 创建的交易笔记
   */
  static async createPresetTradeNote(userId: string): Promise<any> {
    try {
      // 设置交易时间为今天上午10:30
      const tradeTime = new Date();
      tradeTime.setHours(10, 30, 0, 0);

      const tradeNote = await prisma.tradeLog.create({
        data: {
          userId,
          tradeTime,
          symbol: PRESET_TRADE_NOTE_TEMPLATE.symbol,
          direction: PRESET_TRADE_NOTE_TEMPLATE.direction,
          positionSize: PRESET_TRADE_NOTE_TEMPLATE.positionSize,
          entryReason: PRESET_TRADE_NOTE_TEMPLATE.entryReason,
          exitReason: PRESET_TRADE_NOTE_TEMPLATE.exitReason,
          tradeResult: PRESET_TRADE_NOTE_TEMPLATE.tradeResult,
          mindsetState: PRESET_TRADE_NOTE_TEMPLATE.mindsetState,
          lessonsLearned: PRESET_TRADE_NOTE_TEMPLATE.lessonsLearned,
        },
      });

      console.log(`为用户 ${userId} 创建预设交易笔记成功:`, tradeNote.id);
      return tradeNote;
    } catch (error) {
      console.error('创建预设交易笔记失败:', error);
      throw error;
    }
  }

  /**
   * 为新用户创建预设日分析报告
   * @param userId 用户ID
   * @returns 创建的日分析报告
   */
  static async createPresetDailyAnalysis(userId: string): Promise<any> {
    try {
      // 设置分析日期为今天
      const analysisDate = new Date();
      analysisDate.setHours(0, 0, 0, 0);

      // 使用upsert避免唯一约束冲突
      const dailyAnalysis = await prisma.dailyAnalysis.upsert({
        where: {
          userId_date: {
            userId,
            date: analysisDate,
          },
        },
        update: {
          summary: PRESET_DAILY_ANALYSIS_TEMPLATE.summary,
          strengths: PRESET_DAILY_ANALYSIS_TEMPLATE.strengths,
          weaknesses: PRESET_DAILY_ANALYSIS_TEMPLATE.weaknesses,
          emotionalImpact: PRESET_DAILY_ANALYSIS_TEMPLATE.emotionalImpact,
          improvementSuggestions: PRESET_DAILY_ANALYSIS_TEMPLATE.improvementSuggestions,
        },
        create: {
          userId,
          date: analysisDate,
          summary: PRESET_DAILY_ANALYSIS_TEMPLATE.summary,
          strengths: PRESET_DAILY_ANALYSIS_TEMPLATE.strengths,
          weaknesses: PRESET_DAILY_ANALYSIS_TEMPLATE.weaknesses,
          emotionalImpact: PRESET_DAILY_ANALYSIS_TEMPLATE.emotionalImpact,
          improvementSuggestions: PRESET_DAILY_ANALYSIS_TEMPLATE.improvementSuggestions,
        },
      });

      console.log(`为用户 ${userId} 创建预设日分析报告成功:`, dailyAnalysis.id);
      return dailyAnalysis;
    } catch (error) {
      console.error('创建预设日分析报告失败:', error);
      throw error;
    }
  }

  /**
   * 为新用户创建完整的预设数据
   * 包括交易笔记和日分析报告
   * @param userId 用户ID
   * @returns 创建的预设数据
   */
  static async createPresetDataForNewUser(userId: string): Promise<{
    tradeNote: any;
    dailyAnalysis: any;
  }> {
    try {
      console.log(`开始为新用户 ${userId} 创建预设数据...`);

      // 先创建交易笔记
      const tradeNote = await this.createPresetTradeNote(userId);
      
      // 再创建日分析报告
      const dailyAnalysis = await this.createPresetDailyAnalysis(userId);

      console.log(`为用户 ${userId} 创建预设数据完成`);
      
      return {
        tradeNote,
        dailyAnalysis,
      };
    } catch (error) {
      console.error(`为用户 ${userId} 创建预设数据失败:`, error);
      throw error;
    }
  }

  /**
   * 检查用户是否已有预设数据
   * @param userId 用户ID
   * @returns 是否已有预设数据
   */
  static async hasPresetData(userId: string): Promise<boolean> {
    try {
      const tradeCount = await prisma.tradeLog.count({
        where: { userId },
      });

      const analysisCount = await prisma.dailyAnalysis.count({
        where: { userId },
      });

      return tradeCount > 0 || analysisCount > 0;
    } catch (error) {
      console.error('检查用户预设数据失败:', error);
      return false;
    }
  }
}