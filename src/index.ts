import { h, Context, z, Service } from 'koishi'
import * as echarts from 'echarts'

import { type Canvas } from '@ltxhhz/koishi-plugin-skia-canvas'

export const name = 'w-echarts'

declare module 'koishi' {
    interface Context {
        echarts: EChartService
    }
}

export type EChartHandler = {
    chart: echarts.ECharts
    canvas: Canvas
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
    static readonly inject = [ 'skia' ]

    public createChart<Strict extends boolean = false>(
        width: number,
        height: number,
        options: Strict extends true ? StrictEChartsOption : echarts.EChartsOption
    ): EChartHandler {
        const canvas = new this.ctx.skia.Canvas(width, height)
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


    constructor(ctx: Context, public config: EChartService.Config) {
        super(ctx, 'echarts')
        global.Image = ctx.skia.Image
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