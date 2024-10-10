import { h, Context, z, Service } from 'koishi'
import {} from 'koishi-plugin-w-node'

import type skia from '@willbot-koishi/skia-canvas'
import * as echarts from 'echarts'


export const name = 'w-echarts'

declare module 'koishi' {
    interface Context {
        echarts: EChartService
    }
}

export type EChartHandler = {
    chart: echarts.ECharts
    canvas: skia.Canvas
    dispose: () => void
    export: (timeout?: number) => Promise<h>
}

type RemoveIndex<T> = {
    [K in keyof T as
        string extends K ? never :
        number extends K ? never :
        symbol extends K ? never :
        K
    ] : T[K]
}

export type StrictEChartsOption = RemoveIndex<echarts.EChartsOption>

class EChartService extends Service {
    static readonly inject = [ 'node' ]

    public loaded: Promise<boolean>
    public skia: typeof skia

    private oldImage: typeof Image

    public createChart<Strict extends boolean = false>(
        width: number,
        height: number,
        options: Strict extends true ? StrictEChartsOption : echarts.EChartsOption
    ): EChartHandler {
        const canvas = new this.skia.Canvas(width, height)
        const chart = echarts.init(canvas as any)
        chart.setOption({
            textStyle: {
                fontFamily: this.config.font
            },
            ...options
        })
        return {
            chart,
            canvas,
            dispose: () => chart.dispose(),
            export: async (timeout = 2000) => {
                await new Promise<void>(res => {
                    chart.on('finished', () => res())
                    setTimeout(() => res(), timeout)
                })
                const el = h.image(await canvas.toBuffer('png'), 'image/png')
                chart.dispose()
                return el
            }
        }
    }

    public async start() {
        const skia = await this.ctx.node.safeImport<typeof skia>('@willbot-koishi/skia-canvas')
        this.skia = skia
        this.oldImage = global.Image
        global.Image = skia.Image
    }

    public constructor(ctx: Context, public config: EChartService.Config) {
        super(ctx, 'echarts')

        this.ctx.on('dispose', () => {
            global.Image = this.oldImage
        })

        this.ctx.command('echarts', 'ECharts 服务')
    }
}

namespace EChartService {
    export interface Config {
        font: string
    }
    export const Config: z<Config> = z.object({
        font: z.string().default('sans').description('ECharts 使用的字体')
    })
}

export default EChartService

export { echarts }