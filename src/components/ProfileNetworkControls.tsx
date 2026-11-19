import { useEffect, useState } from "react";

import type { DesktopHost, DesktopProfileNetworkModes } from "../app/desktop";
import { showError } from "../app/errorStore";
import { useI18n } from "../app/i18n";
import { Toggle } from "./ui";

export function ProfileNetworkControls(props: {
  host: DesktopHost;
  id: string;
  className: string;
  disabled?: boolean;
}) {
  const { host, id } = props;
  const { t } = useI18n();
  const [modes, setModes] = useState<DesktopProfileNetworkModes | null>(null);
  const [busy, setBusy] = useState(false);
  const { getNetworkModes, setNetworkMode } = host.profiles;

  useEffect(() => {
    if (getNetworkModes === undefined) {
      return;
    }
    let currentRequest = 0;
    const refresh = () => {
      const request = ++currentRequest;
      void getNetworkModes(id).then((value) => {
        if (request === currentRequest) {
          setModes(value);
        }
      }).catch((error) => {
        if (request === currentRequest) {
          setModes(null);
          showError(error);
        }
      });
    };
    const unsubscribe = host.profiles.onChanged(refresh);
    refresh();
    return () => {
      currentRequest++;
      unsubscribe();
    };
  }, [getNetworkModes, host, id]);

  function change(mode: keyof DesktopProfileNetworkModes, enabled: boolean) {
    if (setNetworkMode === undefined) {
      return;
    }
    setBusy(true);
    void setNetworkMode(id, mode, enabled)
      .then(setModes)
      .catch(showError)
      .finally(() => setBusy(false));
  }

  const disabled = modes === null || busy || props.disabled;
  return (
    <div className={props.className} aria-busy={busy}>
      <Toggle
        label={t("TUN")}
        value={modes?.tun ?? false}
        disabled={disabled}
        onChange={(enabled) => change("tun", enabled)}
      />
      <Toggle
        label={t("System HTTP Proxy")}
        value={modes?.systemProxy ?? false}
        disabled={disabled}
        onChange={(enabled) => change("systemProxy", enabled)}
      />
    </div>
  );
}
