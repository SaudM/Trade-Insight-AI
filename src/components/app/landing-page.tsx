'use client';

import { BarChart, Brain, Shield, TrendingUp, Users, Star, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 专业的未登录首页组件
 * 替代原有的简易提示页面，展示产品核心价值、功能亮点和登录入口
 * 采用现代化设计风格，符合Material Design规范，支持响应式布局
 * 
 * @component
 * @returns {JSX.Element} 专业的未登录首页
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95">
      {/* 导航栏 */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center size-10 bg-primary rounded-xl text-primary-foreground">
            <BarChart className="h-5 w-5" />
          </div>
          <span className="font-headline text-xl font-bold text-primary">交易笔记AI</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            登录
          </Link>
          <Link href="/signup">
            <Button size="sm">免费注册</Button>
          </Link>
        </div>
      </nav>

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* 英雄区域 */}
        <section className="text-center mb-16">
          <h1 className="font-headline text-4xl md:text-6xl font-bold text-foreground mb-6">
            智能交易分析
            <span className="text-primary"> 重新定义</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            基于AI的交易笔记平台，帮助您记录、分析并从每一笔交易中学习，
            通过深度数据洞察和智能建议提升交易表现
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                免费开始使用
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                已有账户登录
              </Button>
            </Link>
          </div>

          {/* 信任指标 */}
          <div className="flex flex-wrap justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>1000+ 交易者信任</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>数据安全加密</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>平均收益提升 35%</span>
            </div>
          </div>
        </section>

        {/* 核心功能亮点 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">为什么选择交易笔记AI</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* 功能卡片 1 */}
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <BarChart className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <CardTitle>现代化交易日志</CardTitle>
                <CardDescription>
                  快速记录交易详情，包括入场理由、仓位管理和交易心态
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    完整的交易记录
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    情绪影响分析
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    仓位管理跟踪
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* 功能卡片 2 */}
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Brain className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <CardTitle>AI智能分析</CardTitle>
                <CardDescription>
                  每日、每周、每月AI深度分析，识别交易模式和优化建议
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    成功模式识别
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    常见错误分析
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    个性化改进建议
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* 功能卡片 3 */}
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Shield className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <CardTitle>数据安全私有</CardTitle>
                <CardDescription>
                  所有数据安全存储在您自己的Firebase项目中，确保隐私和数据所有权
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    端到端加密
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    私有化部署
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    完全数据控制
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 用户评价 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">交易者的选择</h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="flex-1">
                    <p className="font-semibold">张先生 - 职业交易员</p>
                    <p className="text-sm text-muted-foreground">外汇市场，3年经验</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "这个平台的AI分析帮我发现了之前忽略的交易模式，
                  我的胜率在两个月内从45%提升到了62%。"
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="flex-1">
                    <p className="font-semibold">李女士 - 股票投资者</p>
                    <p className="text-sm text-muted-foreground">A股市场，5年经验</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "情绪分析功能让我意识到情绪对交易决策的影响，
                  现在我能更好地控制交易心态，减少冲动操作。"
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 行动召唤 */}
        <section className="text-center mb-16">
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="pt-12 pb-12">
              <h2 className="text-3xl font-bold mb-4">立即开始您的智能交易之旅</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                加入1000+交易者的行列，体验AI驱动的交易分析带来的改变
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="gap-2">
                    免费注册
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">
                    已有账户登录
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* 页脚 */}
      <footer className="bg-muted/50 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="flex items-center justify-center size-8 bg-primary rounded-xl text-primary-foreground">
                <BarChart className="h-4 w-4" />
              </div>
              <span className="font-headline text-lg font-bold">交易笔记AI</span>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                隐私政策
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                服务条款
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                联系我们
              </Link>
            </div>
          </div>
          
          <div className="text-center mt-6 text-sm text-muted-foreground">
            <p>© 2024 交易笔记AI. 保留所有权利.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}