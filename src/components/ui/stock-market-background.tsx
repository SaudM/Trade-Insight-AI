'use client'

import React, { useEffect, useRef } from 'react'

/**
 * 股票市场主题背景组件
 * 包含K线图、趋势线和浮动行情数据
 */
export const StockMarketBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number>()

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 设置画布尺寸
        const resizeCanvas = () => {
            if (!canvas) return
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        // K线类
        class Candlestick {
            x: number
            y: number
            width: number
            height: number // 实体高度
            wickHeight: number // 影线高度
            isUp: boolean // 是否上涨
            speed: number
            opacity: number

            constructor() {
                const canvasWidth = canvas?.width || window.innerWidth
                const canvasHeight = canvas?.height || window.innerHeight

                this.x = Math.random() * canvasWidth
                this.y = Math.random() * (canvasHeight * 0.8) + canvasHeight * 0.1 // 集中在中间区域
                this.width = Math.random() * 8 + 4
                this.height = Math.random() * 40 + 10
                this.wickHeight = this.height + Math.random() * 20
                this.isUp = Math.random() > 0.45 // 略微多一点绿柱
                this.speed = Math.random() * 0.5 + 0.2
                this.opacity = Math.random() * 0.3 + 0.05
            }

            update() {
                this.x -= this.speed // 向左移动

                // 超出左边界则重置到右侧
                if (this.x + this.width < 0) {
                    const canvasWidth = canvas?.width || window.innerWidth
                    this.x = canvasWidth + Math.random() * 100
                    this.y = Math.random() * (canvas?.height || window.innerHeight) * 0.8 + (canvas?.height || window.innerHeight) * 0.1
                    this.isUp = Math.random() > 0.45
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.save()
                ctx.globalAlpha = this.opacity
                // 股票红绿配色 (红跌绿涨)
                ctx.fillStyle = this.isUp ? '#10b981' : '#ef4444'
                ctx.strokeStyle = this.isUp ? '#10b981' : '#ef4444'

                const centerX = this.x + this.width / 2

                // 绘制影线
                ctx.beginPath()
                ctx.moveTo(centerX, this.y - (this.wickHeight - this.height) / 2)
                ctx.lineTo(centerX, this.y + this.height + (this.wickHeight - this.height) / 2)
                ctx.stroke()

                // 绘制实体
                ctx.fillRect(this.x, this.y, this.width, this.height)

                ctx.restore()
            }
        }

        // 趋势线类
        class TrendLine {
            points: { x: number; y: number }[]
            color: string
            speed: number
            opacity: number
            lineWidth: number

            constructor() {
                this.points = []
                this.color = Math.random() > 0.5 ? '#3b82f6' : '#8b5cf6' // 蓝或紫
                this.speed = 0.3
                this.opacity = Math.random() * 0.2 + 0.05
                this.lineWidth = Math.random() * 2 + 1
                this.generatePoints()
            }

            generatePoints() {
                const canvasWidth = canvas?.width || window.innerWidth
                const canvasHeight = canvas?.height || window.innerHeight
                const numPoints = 10
                const segmentWidth = canvasWidth / (numPoints - 1)

                // 生成平滑的波动曲线
                let currentY = Math.random() * canvasHeight

                for (let i = 0; i < numPoints + 2; i++) { // 多生成2个点以确保覆盖屏幕外
                    this.points.push({
                        x: i * segmentWidth,
                        y: currentY
                    })
                    // 随机游走
                    currentY += (Math.random() - 0.5) * 150
                    // 边界限制
                    currentY = Math.max(canvasHeight * 0.1, Math.min(canvasHeight * 0.9, currentY))
                }
            }

            update() {
                this.points.forEach(p => p.x -= this.speed)

                const canvasWidth = canvas?.width || window.innerWidth
                const segmentWidth = canvasWidth / (this.points.length - 3)

                // 如果第一个点完全移出，移除并添加新点到末尾
                if (this.points[0].x < -segmentWidth) {
                    this.points.shift()
                    const lastPoint = this.points[this.points.length - 1]
                    const canvasHeight = canvas?.height || window.innerHeight
                    let newY = lastPoint.y + (Math.random() - 0.5) * 150
                    newY = Math.max(canvasHeight * 0.1, Math.min(canvasHeight * 0.9, newY))

                    this.points.push({
                        x: lastPoint.x + segmentWidth,
                        y: newY
                    })
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                if (this.points.length < 2) return

                ctx.save()
                ctx.globalAlpha = this.opacity
                ctx.strokeStyle = this.color
                ctx.lineWidth = this.lineWidth
                ctx.lineJoin = 'round'
                ctx.lineCap = 'round'

                ctx.beginPath()
                // 使用贝塞尔曲线使线条更平滑
                ctx.moveTo(this.points[0].x, this.points[0].y)

                for (let i = 0; i < this.points.length - 1; i++) {
                    const p0 = this.points[i]
                    const p1 = this.points[i + 1]
                    const midX = (p0.x + p1.x) / 2
                    const midY = (p0.y + p1.y) / 2
                    ctx.quadraticCurveTo(p0.x, p0.y, midX, midY)
                }

                ctx.stroke()
                ctx.restore()
            }
        }

        // 浮动行情类
        class Ticker {
            x: number
            y: number
            text: string
            isUp: boolean
            speed: number
            opacity: number
            fontSize: number

            constructor() {
                const canvasWidth = canvas?.width || window.innerWidth
                const canvasHeight = canvas?.height || window.innerHeight
                this.x = Math.random() * canvasWidth
                this.y = Math.random() * canvasHeight
                this.isUp = Math.random() > 0.5
                this.text = (this.isUp ? '+' : '-') + (Math.random() * 5).toFixed(2) + '%'
                this.speed = Math.random() * 0.4 + 0.1
                this.opacity = 0
                this.fontSize = Math.random() * 14 + 10
                // 初始淡入阶段
                this.fadeIn = true
            }

            fadeIn: boolean

            update() {
                this.y -= this.speed // 向上浮动

                // 淡入淡出处理
                if (this.fadeIn) {
                    this.opacity += 0.01
                    if (this.opacity >= 0.4) this.fadeIn = false
                } else {
                    this.opacity -= 0.002
                }

                // 重置
                if (this.opacity <= 0 || this.y < 0) {
                    const canvasWidth = canvas?.width || window.innerWidth
                    const canvasHeight = canvas?.height || window.innerHeight
                    this.x = Math.random() * canvasWidth
                    this.y = canvasHeight + Math.random() * 50
                    this.isUp = Math.random() > 0.5
                    this.text = (this.isUp ? '+' : '-') + (Math.random() * 5).toFixed(2) + '%'
                    this.opacity = 0
                    this.fadeIn = true
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.save()
                ctx.globalAlpha = this.opacity
                ctx.fillStyle = this.isUp ? '#10b981' : '#ef4444'
                ctx.font = `bold ${this.fontSize}px monospace`
                ctx.fillText(this.text, this.x, this.y)
                ctx.restore()
            }
        }

        // 初始化对象
        const candlesticks: Candlestick[] = []
        const trendLines: TrendLine[] = []
        const tickers: Ticker[] = []

        // 数量控制
        const initElements = () => {
            const screenArea = window.innerWidth * window.innerHeight
            const candleCount = Math.floor(screenArea / 15000)
            const lineCount = 3
            const tickerCount = Math.floor(screenArea / 40000)

            for (let i = 0; i < candleCount; i++) candlesticks.push(new Candlestick())
            for (let i = 0; i < lineCount; i++) trendLines.push(new TrendLine())
            for (let i = 0; i < tickerCount; i++) tickers.push(new Ticker())
        }

        initElements()

        // 动画循环
        const animate = () => {
            if (!canvas || !ctx) return
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // 绘制背景网格
            ctx.save()
            ctx.strokeStyle = '#e2e8f0'
            ctx.globalAlpha = 0.03
            const gridSize = 60
            ctx.beginPath()
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height)
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.moveTo(0, y); ctx.lineTo(canvas.width, y)
            }
            ctx.stroke()
            ctx.restore()

            // 绘制元素
            trendLines.forEach(l => { l.update(); l.draw(ctx) })
            candlesticks.forEach(c => { c.update(); c.draw(ctx) })
            tickers.forEach(t => { t.update(); t.draw(ctx) })

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ background: 'transparent' }}
        />
    )
}
