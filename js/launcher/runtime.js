(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});

  NS.runtime = {
    async waitInstallCompletion(ctx, installId) {
      const { launcherAPI, setGameStatus } = ctx;
      if (!launcherAPI || !installId) return { ok: false, error: "Instalación inválida." };
      while (true) {
        const statusRes = await launcherAPI.getInstallStatus(installId);
        if (!statusRes?.ok) return { ok: false, error: statusRes?.error || "No se pudo consultar instalación." };
        const st = statusRes.status || {};
        const pct = Number.isFinite(st.progress) ? `${Math.max(0, Math.min(100, Math.round(st.progress)))}%` : "";
        const msg = st.message || "Procesando...";
        setGameStatus(`[${st.phase || "working"}] ${pct} ${msg}`.trim(), st.phase === "error");
        if (!st.busy) {
          if (st.phase === "done") return { ok: true };
          return { ok: false, error: st.error || st.message || "La instalación no finalizó correctamente." };
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    },

    formatRuntimeDiagnostics(_ctx, st) {
      const lines = [];
      lines.push("Diagnóstico runtime:");
      lines.push(`- running: ${Boolean(st?.running)}`);
      lines.push(`- pid: ${st?.pid ?? "n/a"}`);
      lines.push(`- java seleccionado: ${st?.javaPathSelected || "n/a"}`);
      lines.push(`- java probados: ${Array.isArray(st?.javaPathTried) ? st.javaPathTried.join(" | ") || "n/a" : "n/a"}`);
      lines.push(`- lastExitCode: ${st?.lastExitCode ?? "n/a"}`);
      lines.push(`- lastLifecycleEvent: ${st?.lastLifecycleEvent || "n/a"}`);
      lines.push(`- lineCount: ${Number(st?.lineCount || 0)}`);
      if (Number(st?.silenceMs || 0) > 0) lines.push(`- silenceMs: ${st.silenceMs} (threshold ${st?.stallThresholdMs || "n/a"})`);
      if (st?.lastError) lines.push(`- lastError: ${st.lastError}`);
      if (st?.lastErrorLines) {
        lines.push("- últimas líneas:");
        lines.push(st.lastErrorLines);
      }
      return lines.join("\n");
    },
  };
})();
