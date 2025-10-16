'use client'

import React, { useEffect, useRef } from 'react'

/**
 * 金融科技感粒子背景组件
 * 包含股票图表线条、数据点和动态粒子效果
 */
export const FinancialParticlesBackground: React.FC = () => {
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

    // 粒子类
    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      type: 'dot' | 'line' | 'chart'

      constructor() {
        const canvasWidth = canvas?.width || window.innerWidth
        const canvasHeight = canvas?.height || window.innerHeight
        this.x = Math.random() * canvasWidth
        this.y = Math.random() * canvasHeight
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.size = Math.random() * 2 + 1
        this.opacity = Math.random() * 0.5 + 0.1
        this.type = Math.random() > 0.7 ? 'chart' : Math.random() > 0.5 ? 'line' : 'dot'
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        const canvasWidth = canvas?.width || window.innerWidth
        const canvasHeight = canvas?.height || window.innerHeight

        // 边界检测
        if (this.x < 0 || this.x > canvasWidth) this.vx *= -1
        if (this.y < 0 || this.y > canvasHeight) this.vy *= -1

        // 保持在画布内
        this.x = Math.max(0, Math.min(canvasWidth, this.x))
        this.y = Math.max(0, Math.min(canvasHeight, this.y))
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save()
        ctx.globalAlpha = this.opacity

        switch (this.type) {
          case 'dot':
            // 绘制数据点
            ctx.fillStyle = '#3b82f6'
            ctx.beginPath()
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
            ctx.fill()
            break

          case 'line':
            // 绘制短线段
            ctx.strokeStyle = '#6366f1'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(this.x, this.y)
            ctx.lineTo(this.x + 20, this.y + 10)
            ctx.stroke()
            break

          case 'chart':
            // 绘制小型图表元素（K线图、柱状图等）
            this.drawMiniChart(ctx)
            // 添加数据标签
            this.drawDataLabel(ctx)
            break
        }

        ctx.restore()
      }

      private drawMiniChart(ctx: CanvasRenderingContext2D) {
        const chartType = Math.random()
        
        // 移除K线图，只保留成交量柱状图和趋势线
        if (chartType > 0.5) {
          this.drawVolumeBar(ctx)
        } else {
          this.drawTrendLine(ctx)
        }
      }

      private drawVolumeBar(ctx: CanvasRenderingContext2D) {
        // 绘制成交量柱状图
        const width = 4
        const height = Math.random() * 15 + 5
        
        ctx.fillStyle = '#6366f1'
        ctx.globalAlpha = 0.6
        ctx.fillRect(this.x - width/2, this.y, width, height)
      }

      private drawTrendLine(ctx: CanvasRenderingContext2D) {
        // 绘制趋势线
        const points = 5
        const width = 30
        const height = 15
        
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        
        for (let i = 0; i < points; i++) {
          const x = this.x + (i * width) / (points - 1)
          const y = this.y + Math.sin(i * 0.5 + Date.now() * 0.001) * height * 0.3
          
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      }

      private drawDataLabel(ctx: CanvasRenderingContext2D) {
        // 绘制数据标签
        const labels = ['$', '¥', '€', '₿', '%', '↗', '↘']
        const label = labels[Math.floor(Math.random() * labels.length)]
        
        ctx.fillStyle = '#6b7280'
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(label, this.x, this.y + 15)
      }
    }

    // 股票价格线条类
    class StockLine {
      points: { x: number; y: number }[]
      color: string
      opacity: number

      constructor() {
        this.points = []
        this.color = Math.random() > 0.5 ? '#3b82f6' : '#10b981'
        this.opacity = Math.random() * 0.3 + 0.1
        this.generatePoints()
      }

      generatePoints() {
        const numPoints = 20
        const canvasWidth = canvas?.width || window.innerWidth
        const canvasHeight = canvas?.height || window.innerHeight
        const startX = Math.random() * canvasWidth * 0.3
        const startY = Math.random() * canvasHeight

        for (let i = 0; i < numPoints; i++) {
          this.points.push({
            x: startX + (i * canvasWidth * 0.7) / numPoints,
            y: startY + (Math.random() - 0.5) * 100
          })
        }
      }

      update() {
        // 缓慢移动线条
        this.points.forEach(point => {
          point.x -= 0.2
          point.y += (Math.random() - 0.5) * 0.5
        })

        // 如果线条移出屏幕，重新生成
        if (this.points[this.points.length - 1].x < 0) {
          this.generatePoints()
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        if (this.points.length < 2) return

        ctx.save()
        ctx.globalAlpha = this.opacity
        ctx.strokeStyle = this.color
        ctx.lineWidth = 1
        ctx.beginPath()

        ctx.moveTo(this.points[0].x, this.points[0].y)
        for (let i = 1; i < this.points.length; i++) {
          ctx.lineTo(this.points[i].x, this.points[i].y)
        }
        ctx.stroke()
        ctx.restore()
      }
    }

    // 创建粒子和线条
    const particles: Particle[] = []
    const stockLines: StockLine[] = []

    // 根据屏幕尺寸动态调整粒子数量
    const screenArea = window.innerWidth * window.innerHeight
    const particleCount = Math.min(Math.max(Math.floor(screenArea / 30000), 20), 80)
    const lineCount = Math.min(Math.max(Math.floor(screenArea / 200000), 2), 5)

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    for (let i = 0; i < lineCount; i++) {
      stockLines.push(new StockLine())
    }

    // 绘制网格背景
    const drawGrid = () => {
      ctx.save()
      ctx.globalAlpha = 0.05
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 1

      const gridSize = 50
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
      ctx.restore()
    }

    // 绘制连接线
    const drawConnections = () => {
      ctx.save()
      ctx.globalAlpha = 0.1
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 1

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 100) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      ctx.restore()
    }

    // 性能优化：帧率控制
    let lastTime = 0
    const targetFPS = 30
    const frameInterval = 1000 / targetFPS

    // 动画循环
    const animate = (currentTime: number) => {
      if (currentTime - lastTime < frameInterval) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      lastTime = currentTime

      if (!canvas || !ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制网格（降低频率）
      if (Math.floor(currentTime / 100) % 3 === 0) {
        drawGrid()
      }

      // 更新和绘制股票线条
      stockLines.forEach(line => {
        line.update()
        line.draw(ctx)
      })

      // 更新和绘制粒子
      particles.forEach(particle => {
        particle.update()
        particle.draw(ctx)
      })

      // 绘制连接线（降低频率以提升性能）
      if (Math.floor(currentTime / 50) % 2 === 0) {
        drawConnections()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate(0)

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

export default FinancialParticlesBackground