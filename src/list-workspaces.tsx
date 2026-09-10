import { Icon, List } from "@raycast/api";
import { WorkspaceActions } from "./components/WorkspaceActions";
import { useAerospaceState } from "./lib/useAerospaceState";

export default function Command() {
  const { workspaces, isLoading, error, revalidate } = useAerospaceState();

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error leyendo AeroSpace" description={error.message} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Buscar app o ventana...">
      {workspaces.map((ws) => {
        const statusSuffix = ws.isFocused ? " · enfocado" : ws.isVisible ? " · visible" : "";
        return (
          <List.Section key={ws.name} title={`Escritorio ${ws.name}`} subtitle={`${ws.monitorName}${statusSuffix}`}>
            {ws.windows.length === 0 ? (
              <List.Item
                key={`empty-${ws.name}`}
                title="Sin ventanas"
                icon={Icon.Circle}
                actions={<WorkspaceActions workspace={ws} allWorkspaces={workspaces} onMoved={revalidate} />}
              />
            ) : (
              ws.windows.map((win) => (
                <List.Item
                  key={win.windowId}
                  title={win.appName}
                  subtitle={win.windowTitle}
                  icon={win.appBundlePath ? { fileIcon: win.appBundlePath } : Icon.AppWindow}
                  accessories={[{ text: String(win.windowId) }]}
                  actions={<WorkspaceActions workspace={ws} allWorkspaces={workspaces} onMoved={revalidate} />}
                />
              ))
            )}
          </List.Section>
        );
      })}
    </List>
  );
}
