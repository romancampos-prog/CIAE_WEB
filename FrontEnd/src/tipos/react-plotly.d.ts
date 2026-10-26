// react-plotly.js no trae tipos: solo las props que usa CanalChart (canal endémico).
declare module 'react-plotly.js' {
  import type { ComponentType, CSSProperties } from 'react';

  interface PropsPlot {
    data: object[];
    layout?: object;
    config?: object;
    style?: CSSProperties;
    className?: string;
    useResizeHandler?: boolean;
  }

  const Plot: ComponentType<PropsPlot>;
  export default Plot;
}
