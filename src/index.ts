import { h, Context, Schema, Service } from 'koishi'
import * as echarts from 'echarts'

import { skia } from 'koishi-plugin-skia-canvas'

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
    static readonly inject = [ 'canvas' ]

    public createChart<Strict extends boolean = false>(
        width: number,
        height: number,
        options: Strict extends true ? StrictEChartsOption : echarts.EChartsOption
    ): EChartHandler {
        const canvas = this.ctx.canvas.createCanvas(width, height)
        const chart = echarts.init(canvas as any)
        chart.setOption({
            textStyle: {
                fontFamily: this.ctx.canvas.getPresetFont()
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
                const el = h.image(canvas.toBuffer('image/png'), 'image/png')
                chart.dispose()
                return el
            }
        }
    }

    constructor(ctx: Context) {
        super(ctx, 'echarts')
    }
}

namespace EChartService {
    export interface Config {}
    export const Config: Schema<Config> = Schema.object({})
}

export default EChartService

export { echarts }