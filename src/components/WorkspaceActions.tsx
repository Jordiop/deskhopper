import { Action, ActionPanel, Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { moveAllWindows } from "../lib/aerospace";
import { WorkspaceSnapshot } from "../lib/types";

interface WorkspaceActionsProps {
  workspace: WorkspaceSnapshot;
  allWorkspaces: WorkspaceSnapshot[];
  onMoved: () => void;
}

export function WorkspaceActions({ workspace, allWorkspaces, onMoved }: WorkspaceActionsProps) {
  const targets = allWorkspaces.filter((w) => w.name !== workspace.name);

  async function handleMove(target: string) {
    if (workspace.windows.length === 0) return;

    const confirmed = await confirmAlert({
      title: `¿Mover ${workspace.windows.length} ventana(s) del Escritorio ${workspace.name} al Escritorio ${target}?`,
      primaryAction: { title: "Mover", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Moviendo ventanas..." });
    try {
      const result = await moveAllWindows(workspace.name, target);
      if (result.errors.length === 0) {
        toast.style = Toast.Style.Success;
        toast.title = `Movidas ${result.movedCount}/${result.total} ventanas`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Movidas ${result.movedCount}/${result.total}, ${result.errors.length} fallaron`;
        toast.message = result.errors[0]?.message;
      }
      onMoved();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error moviendo ventanas";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title={`Mover Escritorio ${workspace.name} a...`}>
        <ActionPanel.Submenu title="Mover Todo A…" icon={Icon.ArrowRight}>
          {targets.map((t) => (
            <Action
              key={t.name}
              title={`Escritorio ${t.name} (${t.monitorName})`}
              onAction={() => handleMove(t.name)}
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Actualizar"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onMoved}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
