export interface AerospaceWindow {
  windowId: number;
  windowTitle: string;
  appName: string;
  appBundleId: string;
  appBundlePath: string;
  workspace: string;
}

export interface WorkspaceSnapshot {
  name: string; // "1".."8"
  monitorName: string; // e.g. "L27HAS2K" | "27P2DG5"
  isFocused: boolean; // hay como mucho 1 focused en todo el sistema
  isVisible: boolean; // puede haber hasta N visibles (uno por monitor)
  windows: AerospaceWindow[];
}

export class AerospaceCliError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = "AerospaceCliError";
  }
}
