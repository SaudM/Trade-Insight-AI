import { format } from 'date-fns'
import type { DailyAnalysis, WeeklyReview, MonthlySummary } from '@/lib/types'

// 模拟报告数据
const mockDailyAnalysis: DailyAnalysis = {
  id: '1',
  userId: 'user1',
  date: '2024-01-15',
  summary: 'Test summary',
  strengths: 'Test strengths',
  weaknesses: 'Test weaknesses',
  emotionalImpact: 'Test emotional impact',
  improvementSuggestions: 'Test suggestions',
  createdAt: new Date('2024-01-20T10:30:00Z'),
}

const mockWeeklyReview: WeeklyReview = {
  id: '2',
  userId: 'user1',
  startDate: '2024-01-15',
  endDate: '2024-01-21',
  patternSummary: 'Test pattern',
  errorPatterns: 'Test errors',
  successPatterns: 'Test success',
  positionSizingAnalysis: 'Test position',
  emotionalCorrelation: 'Test emotion',
  improvementPlan: 'Test plan',
  createdAt: new Date('2024-01-22T14:15:00Z'),
}

const mockMonthlySummary: MonthlySummary = {
  id: '3',
  userId: 'user1',
  monthStartDate: '2024-01-01',
  monthEndDate: '2024-01-31',
  performanceComparison: 'Test performance',
  recurringIssues: 'Test issues',
  strategyExecutionEvaluation: 'Test strategy',
  keyLessons: 'Test lessons',
  iterationSuggestions: 'Test iterations',
  createdAt: new Date('2024-02-01T09:00:00Z'),
}

// 测试新的 getReportDate 函数逻辑
describe('Report Date Formatting with createdAt', () => {
  it('should use createdAt for DailyAnalysis instead of date', () => {
    const getReportDate = (r: DailyAnalysis) => r.createdAt
    const reportDate = getReportDate(mockDailyAnalysis)
    
    expect(reportDate).toEqual(new Date('2024-01-20T10:30:00Z'))
    expect(reportDate).not.toEqual(mockDailyAnalysis.date)
  })

  it('should use createdAt for WeeklyReview instead of endDate', () => {
    const getReportDate = (r: WeeklyReview) => r.createdAt
    const reportDate = getReportDate(mockWeeklyReview)
    
    expect(reportDate).toEqual(new Date('2024-01-22T14:15:00Z'))
    expect(reportDate).not.toEqual(mockWeeklyReview.endDate)
  })

  it('should use createdAt for MonthlySummary instead of monthEndDate', () => {
    const getReportDate = (r: MonthlySummary) => r.createdAt
    const reportDate = getReportDate(mockMonthlySummary)
    
    expect(reportDate).toEqual(new Date('2024-02-01T09:00:00Z'))
    expect(reportDate).not.toEqual(mockMonthlySummary.monthEndDate)
  })

  it('should format createdAt dates correctly', () => {
    const testCases = [
      { createdAt: new Date('2024-01-20T10:30:00Z'), expected: '2024/01/20' },
      { createdAt: new Date('2024-12-31T12:00:00Z'), expected: '2024/12/31' },
      { createdAt: new Date('2024-02-29T12:00:00Z'), expected: '2024/02/29' }, // 闰年
    ]

    testCases.forEach(({ createdAt, expected }) => {
      let formattedDate = '未知日期'
      
      try {
        if (createdAt) {
          const date = createdAt instanceof Date ? createdAt : new Date(createdAt)
          if (!isNaN(date.getTime())) {
            formattedDate = format(date, 'yyyy/MM/dd')
          }
        }
      } catch (error) {
        console.warn('日期格式化失败:', error)
      }

      expect(formattedDate).toBe(expected)
    })
  })

  it('should handle invalid dates gracefully', () => {
    const invalidDates = [
      null,
      undefined,
      'invalid-date',
      new Date('invalid'),
    ]

    invalidDates.forEach(invalidDate => {
      let formattedDate = '未知日期'
      
      try {
        if (invalidDate) {
          const date = invalidDate instanceof Date ? invalidDate : new Date(invalidDate as string)
          if (!isNaN(date.getTime())) {
            formattedDate = format(date, 'yyyy/MM/dd')
          }
        }
      } catch (error) {
        console.warn('日期格式化失败:', error)
      }

      expect(formattedDate).toBe('未知日期')
    })
  })

  it('should handle string dates correctly', () => {
    const stringDate = '2024-01-20T10:30:00Z'
    let formattedDate = '未知日期'
    
    try {
        if (stringDate) {
          const date = new Date(stringDate)
          if (!isNaN(date.getTime())) {
            formattedDate = format(date, 'yyyy/MM/dd')
          }
        }
      } catch (error) {
        console.warn('日期格式化失败:', error)
      }

    expect(formattedDate).toBe('2024/01/20')
  })
})