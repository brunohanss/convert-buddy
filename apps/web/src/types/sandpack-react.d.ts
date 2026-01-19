// Minimal module declaration for @codesandbox/sandpack-react
// Provides a fallback when the package or types are not installed.
declare module '@codesandbox/sandpack-react' {
  import * as React from 'react';

  type SandpackProviderProps = React.PropsWithChildren<{
    template?: string;
    files?: Record<string, any>;
    customSetup?: any;
    options?: any;
    theme?: string | object;
  }>;

  export const SandpackProvider: React.FC<SandpackProviderProps>;
  export const SandpackLayout: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const SandpackCodeEditor: React.FC<any>;
  export const SandpackPreview: React.FC<any>;
  export const SandpackConsole: React.FC<any>;

  export default {} as any;
}
