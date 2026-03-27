import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { store } from '../store/mindeaseStore';
import type { AppSettings, VoiceOption } from '../types';

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(store.getSettings());
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const [voiceList, backendSettings] = await Promise.all([api.listVoices(), api.getSettings()]);
        setVoices(voiceList);

        const merged: AppSettings = {
          ...settings,
          voiceId: backendSettings.voiceId || settings.voiceId,
          speed: backendSettings.voiceSettings?.speed ?? settings.speed,
          ngrokUrl: backendSettings.ngrokUrl || settings.ngrokUrl,
        };

        setSettings(merged);
        store.setSettings(merged);
      } catch {
        setNotice('Unable to sync settings from backend. You can still update local preferences.');
      }
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAll = async () => {
    setSaving(true);
    setNotice('');

    try {
      store.setSettings(settings);
      await api.setVoice(settings.voiceId);
      await api.setVoiceConfig(settings.speed);
      setNotice('Settings saved successfully.');
    } catch {
      setNotice('Could not save to backend. Check backend URL and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 page-fade">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-sm text-slate-500">Adjust voice style and backend connection details.</p>
      </div>

      <section className="soft-card space-y-4 p-4">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="backendUrl">
          Backend URL
        </label>
        <input
          id="backendUrl"
          value={settings.backendUrl}
          onChange={(event) => setSettings({ ...settings, backendUrl: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="http://localhost:3000"
        />

        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Current ngrok URL: <span className="font-semibold">{settings.ngrokUrl || 'Not available'}</span>
        </div>
      </section>

      <section className="soft-card space-y-4 p-4">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="voiceId">
          Groq TTS Voice
        </label>
        <select
          id="voiceId"
          value={settings.voiceId}
          onChange={(event) => setSettings({ ...settings, voiceId: event.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Tip: For a calm male voice, select Troy, Daniel, or Austin.
        </p>

        <div>
          <label className="mb-1 block text-sm text-slate-700" htmlFor="speed">
            Voice Speed ({settings.speed.toFixed(2)}x)
          </label>
          <input
            id="speed"
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={settings.speed}
            onChange={(event) => setSettings({ ...settings, speed: Number(event.target.value) })}
            className="w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving}
            className="rounded-full bg-linear-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </section>

      {notice && <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{notice}</div>}
    </div>
  );
}
