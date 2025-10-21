/**
 * 分析数据访问层适配器
 * 提供与Firebase兼容的接口，底层使用PostgreSQL
 */

import { prisma } from '../db';

/**
 * 日分析数据接口
 */
export interface DailyAnalysisData {
  id: string;
  userId: string;
  date: Date;
  summary: string;
  strengths: string;
  weaknesses: string;
  emotionalImpact: string;
  improvementSuggestions: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 周分析数据接口
 */
export interface WeeklyReviewData {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  patternSummary: string;
  errorPatterns: string;
  successPatterns: string;
  positionSizingAnalysis: string;
  emotionalCorrelation: string;
  improvementPlan: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 月分析数据接口
 */
export interface MonthlySummaryData {
  id: string;
  userId: string;
  monthStartDate: Date;
  monthEndDate: Date;
  performanceComparison: string;
  recurringIssues: string;
  strategyExecutionEvaluation: string;
  keyLessons: string;
  iterationSuggestions: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 分析数据访问层适配器类
 */
export class AnalysisAdapter {
  /**
   * 获取用户的日分析列表
   * @param userId 系统用户ID（UUID）
   * @param limit 限制数量
   * @returns Promise<DailyAnalysisData[]> 日分析列表
   */
  static async getUserDailyAnalyses(userId: string, limit: number = 100): Promise<DailyAnalysisData[]> {
    try {
      // userId现在是系统UUID，直接使用
      const analyses = await prisma.dailyAnalysis.findMany({
        where: { userId: userId },
        orderBy: { date: 'desc' },
        take: limit,
      });

      return analyses.map(analysis => this.formatDailyAnalysisData(analysis));
    } catch (error) {
      console.error('获取日分析失败:', error);
      throw new Error('获取日分析失败');
    }
  }

  /**
   * 创建或更新日分析
   * @param analysisData 日分析数据
   * @returns Promise<DailyAnalysisData> 创建或更新的日分析
   */
  static async createDailyAnalysis(
    analysisData: Omit<DailyAnalysisData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DailyAnalysisData> {
    try {
      const analysis = await prisma.dailyAnalysis.upsert({
        where: {
          userId_date: {
            userId: analysisData.userId,
            date: analysisData.date,
          },
        },
        update: {
          summary: analysisData.summary,
          strengths: analysisData.strengths,
          weaknesses: analysisData.weaknesses,
          emotionalImpact: analysisData.emotionalImpact,
          improvementSuggestions: analysisData.improvementSuggestions,
          updatedAt: new Date(),
        },
        create: {
          userId: analysisData.userId,
          date: analysisData.date,
          summary: analysisData.summary,
          strengths: analysisData.strengths,
          weaknesses: analysisData.weaknesses,
          emotionalImpact: analysisData.emotionalImpact,
          improvementSuggestions: analysisData.improvementSuggestions,
        },
      });

      return this.formatDailyAnalysisData(analysis);
    } catch (error) {
      console.error('创建或更新日分析失败:', error);
      throw new Error('创建或更新日分析失败');
    }
  }

  /**
   * 获取用户的周分析列表
   * @param userId 系统用户ID（UUID）
   * @param limit 限制数量
   * @returns Promise<WeeklyReviewData[]> 周分析列表
   */
  static async getUserWeeklyReviews(userId: string, limit: number = 100): Promise<WeeklyReviewData[]> {
    try {
      // userId现在是系统UUID，直接使用
      const reviews = await prisma.weeklyReview.findMany({
        where: { userId: userId },
        orderBy: { startDate: 'desc' },
        take: limit,
      });

      return reviews.map(review => this.formatWeeklyReviewData(review));
    } catch (error) {
      console.error('获取周分析失败:', error);
      throw new Error('获取周分析失败');
    }
  }

  /**
   * 创建或更新周分析
   * @param reviewData 周分析数据
   * @returns Promise<WeeklyReviewData> 创建或更新的周分析
   */
  static async createWeeklyReview(
    reviewData: Omit<WeeklyReviewData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WeeklyReviewData> {
    try {
      const review = await prisma.weeklyReview.upsert({
        where: {
          userId_startDate_endDate: {
            userId: reviewData.userId,
            startDate: reviewData.startDate,
            endDate: reviewData.endDate,
          },
        },
        update: {
          patternSummary: reviewData.patternSummary,
          errorPatterns: reviewData.errorPatterns,
          successPatterns: reviewData.successPatterns,
          positionSizingAnalysis: reviewData.positionSizingAnalysis,
          emotionalCorrelation: reviewData.emotionalCorrelation,
          improvementPlan: reviewData.improvementPlan,
          updatedAt: new Date(),
        },
        create: {
          userId: reviewData.userId,
          startDate: reviewData.startDate,
          endDate: reviewData.endDate,
          patternSummary: reviewData.patternSummary,
          errorPatterns: reviewData.errorPatterns,
          successPatterns: reviewData.successPatterns,
          positionSizingAnalysis: reviewData.positionSizingAnalysis,
          emotionalCorrelation: reviewData.emotionalCorrelation,
          improvementPlan: reviewData.improvementPlan,
        },
      });

      return this.formatWeeklyReviewData(review);
    } catch (error) {
      console.error('创建或更新周分析失败:', error);
      throw new Error('创建或更新周分析失败');
    }
  }

  /**
   * 获取用户的月分析列表
   * @param userId 系统用户ID（UUID）
   * @param limit 限制数量
   * @returns Promise<MonthlySummaryData[]> 月分析列表
   */
  static async getUserMonthlySummaries(userId: string, limit: number = 100): Promise<MonthlySummaryData[]> {
    try {
      // userId现在是系统UUID，直接使用
      const summaries = await prisma.monthlySummary.findMany({
        where: { userId: userId },
        orderBy: { monthStartDate: 'desc' },
        take: limit,
      });

      return summaries.map(summary => this.formatMonthlySummaryData(summary));
    } catch (error) {
      console.error('获取月分析失败:', error);
      throw new Error('获取月分析失败');
    }
  }

  /**
   * 创建或更新月分析
   * @param summaryData 月分析数据
   * @returns Promise<MonthlySummaryData> 创建或更新的月分析
   */
  static async createMonthlySummary(
    summaryData: Omit<MonthlySummaryData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MonthlySummaryData> {
    try {
      const summary = await prisma.monthlySummary.upsert({
        where: {
          userId_monthStartDate_monthEndDate: {
            userId: summaryData.userId,
            monthStartDate: summaryData.monthStartDate,
            monthEndDate: summaryData.monthEndDate,
          },
        },
        update: {
          performanceComparison: summaryData.performanceComparison,
          recurringIssues: summaryData.recurringIssues,
          strategyExecutionEvaluation: summaryData.strategyExecutionEvaluation,
          keyLessons: summaryData.keyLessons,
          iterationSuggestions: summaryData.iterationSuggestions,
          updatedAt: new Date(),
        },
        create: {
          userId: summaryData.userId,
          monthStartDate: summaryData.monthStartDate,
          monthEndDate: summaryData.monthEndDate,
          performanceComparison: summaryData.performanceComparison,
          recurringIssues: summaryData.recurringIssues,
          strategyExecutionEvaluation: summaryData.strategyExecutionEvaluation,
          keyLessons: summaryData.keyLessons,
          iterationSuggestions: summaryData.iterationSuggestions,
        },
      });

      return this.formatMonthlySummaryData(summary);
    } catch (error) {
      console.error('创建或更新月分析失败:', error);
      throw new Error('创建或更新月分析失败');
    }
  }

  /**
   * 格式化日分析数据
   * @param analysis Prisma日分析对象
   * @returns DailyAnalysisData 格式化后的日分析数据
   */
  private static formatDailyAnalysisData(analysis: any): DailyAnalysisData {
    return {
      id: analysis.id,
      userId: analysis.userId,
      date: analysis.date,
      summary: analysis.summary,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      emotionalImpact: analysis.emotionalImpact,
      improvementSuggestions: analysis.improvementSuggestions,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }

  /**
   * 格式化周分析数据
   * @param review Prisma周分析对象
   * @returns WeeklyReviewData 格式化后的周分析数据
   */
  private static formatWeeklyReviewData(review: any): WeeklyReviewData {
    return {
      id: review.id,
      userId: review.userId,
      startDate: review.startDate,
      endDate: review.endDate,
      patternSummary: review.patternSummary,
      errorPatterns: review.errorPatterns,
      successPatterns: review.successPatterns,
      positionSizingAnalysis: review.positionSizingAnalysis,
      emotionalCorrelation: review.emotionalCorrelation,
      improvementPlan: review.improvementPlan,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  /**
   * 格式化月分析数据
   * @param summary Prisma月分析对象
   * @returns MonthlySummaryData 格式化后的月分析数据
   */
  private static formatMonthlySummaryData(summary: any): MonthlySummaryData {
    return {
      id: summary.id,
      userId: summary.userId,
      monthStartDate: summary.monthStartDate,
      monthEndDate: summary.monthEndDate,
      performanceComparison: summary.performanceComparison,
      recurringIssues: summary.recurringIssues,
      strategyExecutionEvaluation: summary.strategyExecutionEvaluation,
      keyLessons: summary.keyLessons,
      iterationSuggestions: summary.iterationSuggestions,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    };
  }
}