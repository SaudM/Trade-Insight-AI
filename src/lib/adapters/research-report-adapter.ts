
import { prisma } from '@/lib/db';

export interface ResearchReportAuthorData {
    id: string;
    name: string;
}

export interface ResearchReportData {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    stocks?: string[]; // Array of symbols
    author?: ResearchReportAuthorData;
}

export class ResearchReportAdapter {
    /**
     * 获取所有研发报告
     */
    static async getAllReports(): Promise<ResearchReportData[]> {
        try {
            const reports = await prisma.researchReport.findMany({
                include: {
                    stocks: true,
                    author: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return reports.map((report: any) => ({
                id: report.id,
                title: report.title,
                content: report.content,
                createdAt: report.createdAt,
                updatedAt: report.updatedAt,
                stocks: report.stocks.map((s: any) => s.symbol),
                author: report.author ? { id: report.author.id, name: report.author.name } : undefined,
            }));
        } catch (error) {
            console.error('获取研发报告失败:', error);
            throw new Error('获取研发报告失败');
        }
    }

    /**
     * 根据 ID 获取单个报告
     */
    static async getReportById(id: string): Promise<ResearchReportData | null> {
        try {
            const report = await prisma.researchReport.findUnique({
                where: { id },
                include: {
                    stocks: true,
                    author: {
                        select: { id: true, name: true }
                    }
                },
            });

            if (!report) return null;

            return {
                id: report.id,
                title: report.title,
                content: report.content,
                createdAt: report.createdAt,
                updatedAt: report.updatedAt,
                stocks: report.stocks.map((s: any) => s.symbol),
                author: report.author ? { id: report.author.id, name: report.author.name } : undefined,
            };
        } catch (error) {
            console.error('获取研发报告失败:', error);
            throw new Error('获取研发报告失败');
        }
    }

    /**
     * 创建新的研发报告
     */
    static async createReport(data: { title: string; content: string; symbols: string[]; authorId: string }): Promise<ResearchReportData> {
        try {
            const report = await prisma.researchReport.create({
                data: {
                    title: data.title,
                    content: data.content,
                    authorId: data.authorId,
                    stocks: {
                        create: data.symbols.map((symbol) => ({
                            symbol,
                        })),
                    },
                },
                include: {
                    stocks: true,
                    author: {
                        select: { id: true, name: true }
                    }
                },
            });

            return {
                id: report.id,
                title: report.title,
                content: report.content,
                createdAt: report.createdAt,
                updatedAt: report.updatedAt,
                stocks: report.stocks.map((s: any) => s.symbol),
                author: report.author ? { id: report.author.id, name: report.author.name } : undefined,
            };
        } catch (error) {
            console.error('创建研发报告失败:', error);
            throw new Error('创建研发报告失败');
        }
    }

    /**
     * 删除研发报告 (仅作者可删)
     */
    static async deleteReport(id: string, userId: string): Promise<boolean> {
        try {
            const report = await prisma.researchReport.findUnique({
                where: { id },
                select: { authorId: true }
            });

            if (!report) {
                throw new Error('报告不存在');
            }

            if (report.authorId !== userId) {
                throw new Error('无权删除此报告');
            }

            await prisma.researchReport.delete({
                where: { id }
            });

            return true;
        } catch (error: any) {
            console.error('删除研发报告失败:', error);
            throw error;
        }
    }

    /**
     * 检查股票是否有对应的报告
     */
    static async hasReport(symbol: string): Promise<boolean> {
        try {
            const count = await prisma.researchReportStock.count({
                where: { symbol },
            });
            return count > 0;
        } catch (error) {
            console.error('检查股票报告失败:', error);
            return false;
        }
    }

    /**
     * 获取某只股票的所有报告
     */
    static async getReportsBySymbol(symbol: string): Promise<ResearchReportData[]> {
        try {
            const reportStocks = await prisma.researchReportStock.findMany({
                where: { symbol },
                include: {
                    report: {
                        include: {
                            stocks: true,
                            author: {
                                select: { id: true, name: true }
                            }
                        }
                    },
                },
            });

            return reportStocks.map((rs: any) => ({
                id: rs.report.id,
                title: rs.report.title,
                content: rs.report.content,
                createdAt: rs.report.createdAt,
                updatedAt: rs.report.updatedAt,
                stocks: rs.report.stocks.map((s: any) => s.symbol),
                author: rs.report.author ? { id: rs.report.author.id, name: rs.report.author.name } : undefined,
            }));
        } catch (error) {
            console.error('获取股票报告失败:', error);
            throw new Error('获取股票报告失败');
        }
    }
}
