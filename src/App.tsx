import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar, type ActiveTab } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { FarmView } from '@/components/FarmView';
import { DatabaseView } from '@/components/DatabaseView';
import { ConsoleView } from '@/components/ConsoleView';
import { SettingsView } from '@/components/SettingsView';
import { GithubStarDialog } from '@/components/GithubStarDialog';
import { useDiscordStatus } from '@/hooks/useDiscordStatus';
import { useSpooferEvents } from '@/hooks/useSpooferEvents';
import { useStarPrompt } from '@/hooks/useStarPrompt';
import type { SpooferConfig } from '@/types/spoofer';
import { DEFAULT_CONFIG, loadConfig, saveConfig } from '@/lib/settingsStorage';
import { SettingsExtras } from '@/components/SettingsExtras';
import { SessionSummaryDialog, formatClock } from '@/components/SessionSummaryDialog';
import { usePrefs } from '@/hooks/usePrefs';
import { usePresets } from '@/hooks/usePresets';
import { useAutoStop } from '@/hooks/useAutoStop';
import { useSessionSummary } from '@/hooks/useSessionSummary';
import { useI18n } from '@/i18n/I18nProvider';
import { tauriApi } from '@/lib/tauri';
import { applyZoom, notify } from '@/lib/native';
import type { Preset } from '@/lib/presets';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isFarmRun, setIsFarmRun] = useState(false);
  const [config, setConfig] = useState<SpooferConfig>(loadConfig);

  // Settings are remembered between launches.
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const resetConfig = () => setConfig({ ...DEFAULT_CONFIG });

  const { t } = useI18n();
  const { prefs, update: updatePrefs, toggleFavorite, toggleBlacklist } = usePrefs();
  const { presets, savePreset, deletePreset } = usePresets();

  // A preset only replaces the run settings; beta stays as the user set it.
  const applyPreset = (preset: Preset) =>
    setConfig((prev) => ({ ...prev, ...preset.settings }));

  const {
    isRunning: isDiscordRunning,
    refetch: recheckDiscord,
  } = useDiscordStatus();

  const {
    status,
    errorMessage,
    tickData,
    logs,
    totalDatabaseGames,
    processGamesCount,
    rpcGamesCount,
    historyCount,
    historyProcessCount,
    historyRpcCount,
    isFetchingDatabase,
    actions,
  } = useSpooferEvents();

  // "Star us on GitHub" dialog — appears once the threshold of spoofed games is reached
  const starPrompt = useStarPrompt(historyCount);

  // With beta off only native OS games may run, no matter what was picked earlier.
  const effectiveConfig = useMemo<SpooferConfig>(
    () => ({
      ...config,
      spoof_mode: config.beta_enabled ? config.spoof_mode : 'process_only',
      exclude_game_ids: prefs.blacklist,
    }),
    [config, prefs.blacklist]
  );

  const { summary, dismiss: dismissSummary, markTimerStop } = useSessionSummary(
    status,
    tickData,
    isFarmRun
  );

  // Auto-stop timer for the main mode (the farm tab has its own timer).
  useAutoStop(status, prefs.auto_stop_minutes, !isFarmRun, () => {
    markTimerStop();
    actions.addLog('info', t('logs.autoStopped', { count: prefs.auto_stop_minutes }));
    actions.stop();
  });

  // Desktop notification when a run ends and the window is not in front.
  useEffect(() => {
    if (!summary || !prefs.notify_on_finish || summary.outcome === 'stopped') return;
    if (document.hasFocus()) return;
    notify(
      t('notify.title', { result: t(`summary.${summary.outcome}`) }),
      t('notify.body', {
        succeeded: summary.succeeded,
        failed: summary.failed,
        duration: formatClock(summary.durationSecs),
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  // Backend needs to know whether the close button hides the window to the tray.
  useEffect(() => {
    tauriApi.setCloseToTray(prefs.close_to_tray).catch(() => undefined);
  }, [prefs.close_to_tray]);

  useEffect(() => {
    applyZoom(prefs.ui_scale);
  }, [prefs.ui_scale]);

  // Load database on start if empty
  useEffect(() => {
    actions.fetchGames();
  }, []);

  const handleStart = () => {
    setIsFarmRun(false);
    actions.start(effectiveConfig);
  };

  const handleStartFarm = (gameIds: string[], durationSecs: number | null) => {
    setIsFarmRun(true);
    actions.start({
      ...effectiveConfig,
      farm_game_ids: gameIds,
      farm_duration_secs: durationSecs,
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0e14] text-foreground select-none font-sans">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDiscordRunning={isDiscordRunning}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden min-w-0 bg-[#0e0f16]">
        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              status={status}
              tickData={tickData}
              totalAvailableGames={totalDatabaseGames}
              processGamesCount={processGamesCount}
              rpcGamesCount={rpcGamesCount}
              historyCount={historyCount}
              historyProcessCount={historyProcessCount}
              historyRpcCount={historyRpcCount}
              logs={logs}
              config={effectiveConfig}
              onConfigChange={setConfig}
              onOpenSettings={() => setActiveTab('settings')}
              autoStopMinutes={prefs.auto_stop_minutes}
              onAutoStopChange={(minutes) => updatePrefs({ auto_stop_minutes: minutes })}
              presets={presets}
              onApplyPreset={applyPreset}
              onStart={handleStart}
              onPause={actions.pause}
              onResume={actions.resume}
              onStop={actions.stop}
            />
          )}

          {activeTab === 'farm' && (
            <FarmView
              status={status}
              tickData={tickData}
              isFarmRun={isFarmRun}
              isBetaEnabled={Boolean(config.beta_enabled)}
              excludeAdult={Boolean(config.exclude_adult)}
              blacklist={prefs.blacklist}
              favorites={prefs.favorites}
              isFetching={isFetchingDatabase}
              onStart={handleStartFarm}
              onStop={actions.stop}
            />
          )}

          {activeTab === 'database' && (
            <DatabaseView
              onRefresh={() => actions.fetchGames(true)}
              isFetching={isFetchingDatabase}
              historyCount={historyCount}
              favorites={prefs.favorites}
              blacklist={prefs.blacklist}
              onToggleFavorite={toggleFavorite}
              onToggleBlacklist={toggleBlacklist}
            />
          )}

          {activeTab === 'console' && (
            <ConsoleView logs={logs} onClear={actions.clearLogs} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              config={config}
              onConfigChange={setConfig}
              onResetConfig={resetConfig}
              historyCount={historyCount}
              onClearHistory={actions.clearHistory}
              onExportHistory={actions.exportHistory}
              onImportHistory={actions.importHistory}
              isDiscordRunning={isDiscordRunning}
              onRecheckDiscord={recheckDiscord}
              extras={
                <SettingsExtras
                  prefs={prefs}
                  onPrefsChange={updatePrefs}
                  onToggleBlacklist={toggleBlacklist}
                  presets={presets}
                  onSavePreset={(name) => savePreset(name, config)}
                  onDeletePreset={deletePreset}
                  onApplyPreset={applyPreset}
                />
              }
            />
          )}
        </div>
      </main>

      <SessionSummaryDialog summary={summary} onClose={dismissSummary} />

      <GithubStarDialog
        open={starPrompt.isOpen}
        gamesCount={starPrompt.gamesCount}
        onOpenRepo={starPrompt.openRepo}
        onAccept={starPrompt.accept}
        onDecline={starPrompt.decline}
      />
    </div>
  );
};

export default App;
