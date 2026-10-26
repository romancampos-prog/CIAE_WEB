// Permite variables CSS en style={{ '--ic': color }}: así reciben su color las familias,
// el semáforo y los modales sin tener que hacer cast en cada componente.
import 'react';

declare module 'react' {
  interface CSSProperties {
    [variable: `--${string}`]: string | number | undefined;
  }
}
