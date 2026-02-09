
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const reportContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>深度选股分析：基本面与预期差仪表盘</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap');
        body { font-family: 'Noto Sans SC', sans-serif; }
        .chart-container { position: relative; width: 100%; max-width: 600px; margin: 0 auto; height: 350px; }
        .fade-in { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .card-hover { transition: all 0.3s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .active-stock { border-left: 4px solid #0f172a; background-color: #f1f5f9; }
    </style>
</head>
<body class="bg-stone-50 text-slate-800 min-h-screen flex flex-col p-8">
    <div class="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div class="bg-slate-900 p-8 text-white">
            <h1 class="text-3xl font-bold mb-2">深度投研：基本面与预期差分析</h1>
            <p class="text-slate-400">本报告针对当前市场热门标的进行了深度复盘，重点评估“预期差”带来的 Alpha 收益。</p>
        </div>
        <div class="p-8 space-y-6">
            <section>
                <h2 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                    核心逻辑：AI 算力与半导体国产替代
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                        <h3 class="font-bold text-emerald-800 mb-2">海力士 (SK Hynix)</h3>
                        <p class="text-sm text-emerald-700 leading-relaxed">AI 时代的“卖水人”，HBM 内存绝对龙头。产能预定至 2025 年底，技术壁垒极高。</p>
                    </div>
                    <div class="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <h3 class="font-bold text-blue-800 mb-2">中微公司 (AMEC)</h3>
                        <p class="text-sm text-blue-700 leading-relaxed">刻蚀机国产替代绝对龙头，受益于国内晶圆厂逆势扩产，订单充沛。</p>
                    </div>
                </div>
            </section>
            <div class="bg-slate-50 p-8 rounded-3xl text-center">
                <p class="text-slate-500 italic">“在共识中寻找分歧，在分歧中寻找确定性。”</p>
            </div>
        </div>
    </div>
</body>
</html>`;

    const report = await prisma.researchReport.create({
        data: {
            title: "2025 科技与半导体深度调研报告：寻找 Alpha 预期差",
            content: reportContent,
            stocks: {
                create: [
                    { symbol: "KRX: 000660" },
                    { symbol: "SHA: 688012" },
                    { symbol: "NASDAQ: DUOL" },
                    { symbol: "NASDAQ: WDC" }
                ]
            }
        }
    });

    console.log('Seed data created:', report.id);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
