import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { AerospaceCliError, AerospaceWindow, WorkspaceSnapshot } from "./types";

const execFileAsync = promisify(execFile);

interface Preferences {
  aerospacePath: string;
}

function getBinaryPath(): string {
  const { aerospacePath } = getPreferenceValues<Preferences>();
  return aerospacePath || "/opt/homebrew/bin/aerospace";
}

interface ExecFileError extends Error {
  code?: string;
  stderr?: string;
}

async function runAerospace(args: string[]): Promise<string> {
  const bin = getBinaryPath();
  try {
    const { stdout } = await execFileAsync(bin, args, { timeout: 10_000 });
    return stdout;
  } catch (err) {
    const execErr = err as ExecFileError;
    if (execErr.code === "ENOENT") {
      throw new AerospaceCliError(
        `No se encontró el binario de AeroSpace en "${bin}". Revisa la preferencia "Ruta del binario aerospace" o instala AeroSpace con Homebrew.`,
        args.join(" "),
      );
    }
    throw new AerospaceCliError(
      `Falló "aerospace ${args.join(" ")}": ${execErr.stderr?.trim() || execErr.message}`,
      args.join(" "),
      execErr.stderr,
    );
  }
}

async function runAerospaceJson<T>(args: string[]): Promise<T> {
  const stdout = await runAerospace([...args, "--json"]);
  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new AerospaceCliError(`Salida JSON inválida de "aerospace ${args.join(" ")}"`, args.join(" "), stdout);
  }
}

// --- lecturas ---

async function getWorkspaceMonitorMap(): Promise<Record<string, string>> {
  const rows = await runAerospaceJson<{ workspace: string; "monitor-name": string }[]>([
    "list-workspaces",
    "--all",
    "--format",
    "%{workspace}%{monitor-name}",
  ]);
  return Object.fromEntries(rows.map((r) => [r.workspace, r["monitor-name"]]));
}

async function getVisibleWorkspaces(): Promise<Set<string>> {
  const rows = await runAerospaceJson<{ workspace: string }[]>(["list-workspaces", "--monitor", "all", "--visible"]);
  return new Set(rows.map((r) => r.workspace));
}

async function getFocusedWorkspace(): Promise<string | undefined> {
  const rows = await runAerospaceJson<{ workspace: string }[]>(["list-workspaces", "--focused"]);
  return rows[0]?.workspace;
}

async function getAllWindows(): Promise<AerospaceWindow[]> {
  const rows = await runAerospaceJson<Record<string, unknown>[]>([
    "list-windows",
    "--all",
    "--format",
    "%{workspace}%{app-name}%{app-bundle-id}%{app-bundle-path}%{window-id}%{window-title}",
  ]);
  // Validación defensiva: descarta filas mal formadas en lugar de crashear la lista completa
  return rows.flatMap((r) => {
    if (typeof r["window-id"] !== "number" || typeof r["workspace"] !== "string") return [];
    return [
      {
        windowId: r["window-id"] as number,
        windowTitle: String(r["window-title"] ?? ""),
        appName: String(r["app-name"] ?? "Desconocido"),
        appBundleId: String(r["app-bundle-id"] ?? ""),
        appBundlePath: String(r["app-bundle-path"] ?? ""),
        workspace: r["workspace"] as string,
      },
    ];
  });
}

export async function getAerospaceSnapshot(): Promise<WorkspaceSnapshot[]> {
  const [monitorMap, visible, focused, windows] = await Promise.all([
    getWorkspaceMonitorMap(),
    getVisibleWorkspaces(),
    getFocusedWorkspace(),
    getAllWindows(),
  ]);

  const workspaceNames = Object.keys(monitorMap).sort((a, b) => Number(a) - Number(b));

  return workspaceNames.map((name) => ({
    name,
    monitorName: monitorMap[name] ?? "?",
    isFocused: name === focused,
    isVisible: visible.has(name),
    windows: windows.filter((w) => w.workspace === name),
  }));
}

// --- mutación ---

export interface MoveAllResult {
  movedCount: number;
  total: number;
  errors: { windowId: number; message: string }[];
}

export async function moveAllWindows(sourceWorkspace: string, targetWorkspace: string): Promise<MoveAllResult> {
  const windows = await getAllWindows();
  const ids = windows.filter((w) => w.workspace === sourceWorkspace).map((w) => w.windowId);

  const errors: MoveAllResult["errors"] = [];
  let movedCount = 0;

  // Secuencial a propósito: evita condiciones de carrera en el servidor de AeroSpace;
  // el volumen de ventanas por escritorio es bajo, así que el coste es despreciable.
  for (const windowId of ids) {
    try {
      await runAerospace(["move-node-to-workspace", "--window-id", String(windowId), "--", targetWorkspace]);
      movedCount++;
    } catch (err) {
      errors.push({ windowId, message: err instanceof Error ? err.message : String(err) });
    }
  }

  return { movedCount, total: ids.length, errors };
}
