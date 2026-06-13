import { useEffect, useState, type FormEvent } from 'react';
import { browser } from 'wxt/browser';
import {
  displayName,
  downloaders,
  getClient,
  type DownloaderEntry,
  type DownloaderType,
} from '@/utils/downloaders';
import {
  categoriesStorage,
  domainRulesStorage,
  downloadersStorage,
  preferredStorage,
  type DomainRule,
} from '@/utils/storage';
import type { MessageResponse } from '@/utils/messages';

type Feedback = { kind: 'ok' | 'bad'; text: string } | null;

const DOWNLOADER_TYPES = Object.keys(downloaders) as DownloaderType[];

const EMPTY_FORM = {
  type: 'qbittorrent' as DownloaderType,
  label: '',
  url: '',
  username: '',
  password: '',
};

function App() {
  const [entries, setEntries] = useState<DownloaderEntry[]>([]);
  const [preferredId, setPreferredId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // null = form hidden, '' = adding new, otherwise the id being edited.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [testing, setTesting] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [rules, setRules] = useState<DomainRule[]>([]);
  const [newRule, setNewRule] = useState({ domain: '', category: '' });

  const client = getClient(form.type);

  useEffect(() => {
    (async () => {
      const [list, preferred, cats, domainRules] = await Promise.all([
        downloadersStorage.getValue(),
        preferredStorage.getValue(),
        categoriesStorage.getValue(),
        domainRulesStorage.getValue(),
      ]);
      setEntries(list);
      setPreferredId(preferred);
      setCategories(cats);
      setRules(domainRules);
      setLoaded(true);
      if (list.length === 0) setEditingId('');
    })();
  }, []);

  const persistEntries = async (next: DownloaderEntry[]) => {
    setEntries(next);
    await downloadersStorage.setValue(next);
  };

  const persistPreferred = async (id: string | null) => {
    setPreferredId(id);
    await preferredStorage.setValue(id);
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFeedback(null);
    setEditingId('');
  };

  const openEdit = (entry: DownloaderEntry) => {
    setForm({
      type: entry.type,
      label: entry.label ?? '',
      url: entry.url,
      username: entry.username,
      password: entry.password,
    });
    setFeedback(null);
    setEditingId(entry.id);
  };

  const closeForm = () => {
    setEditingId(null);
    setFeedback(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^https?:\/\//.test(form.url.trim())) {
      setFeedback({ kind: 'bad', text: 'The address must start with http:// or https://' });
      return;
    }
    const fields = {
      type: form.type,
      label: form.label.trim() || undefined,
      url: form.url.trim(),
      username: form.username,
      password: form.password,
    };

    if (editingId) {
      await persistEntries(
        entries.map((e) => (e.id === editingId ? { ...e, ...fields } : e)),
      );
    } else {
      const entry: DownloaderEntry = { id: crypto.randomUUID(), enabled: true, ...fields };
      await persistEntries([...entries, entry]);
      if (entries.length === 0) await persistPreferred(entry.id);
    }
    closeForm();
  };

  const test = async () => {
    setTesting(true);
    setFeedback(null);
    const res = (await browser.runtime.sendMessage({
      type: 'TEST_CONNECTION',
      config: {
        type: form.type,
        url: form.url.trim(),
        username: form.username,
        password: form.password,
      },
    })) as MessageResponse;
    setTesting(false);
    setFeedback(
      res.ok
        ? { kind: 'ok', text: `Connected to ${res.data ?? client.name}` }
        : { kind: 'bad', text: res.error },
    );
  };

  const toggleEnabled = (entry: DownloaderEntry) =>
    persistEntries(entries.map((e) => (e.id === entry.id ? { ...e, enabled: !e.enabled } : e)));

  const remove = async (entry: DownloaderEntry) => {
    await persistEntries(entries.filter((e) => e.id !== entry.id));
    if (preferredId === entry.id) await persistPreferred(null);
    if (editingId === entry.id) closeForm();
  };

  const addCategory = async (event: FormEvent) => {
    event.preventDefault();
    const name = newCategory.trim().toLowerCase();
    if (!name || categories.includes(name)) return;
    const next = [...categories, name];
    setCategories(next);
    setNewCategory('');
    await categoriesStorage.setValue(next);
  };

  const removeCategory = async (name: string) => {
    const nextCats = categories.filter((c) => c !== name);
    const nextRules = rules.filter((r) => r.category !== name);
    setCategories(nextCats);
    setRules(nextRules);
    await categoriesStorage.setValue(nextCats);
    await domainRulesStorage.setValue(nextRules);
  };

  const addRule = async (event: FormEvent) => {
    event.preventDefault();
    const domain = newRule.domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
    if (!domain || !newRule.category) return;
    const next = [...rules.filter((r) => r.domain !== domain), { domain, category: newRule.category }];
    setRules(next);
    setNewRule({ domain: '', category: '' });
    await domainRulesStorage.setValue(next);
  };

  const removeRule = async (domain: string) => {
    const next = rules.filter((r) => r.domain !== domain);
    setRules(next);
    await domainRulesStorage.setValue(next);
  };

  if (!loaded) return null;

  return (
    <main className="settings">
      <header>
        <h1>
          <span className="prompt">~$</span> settings
          <span className="cursor" aria-hidden />
        </h1>
        <p className="subtitle">// manage your download clients</p>
      </header>

      {entries.length > 0 && (
        <ul className="clients">
          {entries.map((entry) => (
            <li key={entry.id} className={`client-card${entry.enabled ? '' : ' disabled'}`}>
              <div className="client-head">
                <div className="client-id">
                  <span className="client-name">{displayName(entry)}</span>
                  <span className="client-type">{getClient(entry.type).name}</span>
                </div>
                <label className="switch" title={entry.enabled ? 'Active' : 'Inactive'}>
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={() => toggleEnabled(entry)}
                  />
                  <span>{entry.enabled ? 'active' : 'inactive'}</span>
                </label>
              </div>
              <div className="client-url">{entry.url}</div>
              <div className="client-actions">
                <label className="preferred" title="Magnet clicks go to your preferred client">
                  <input
                    type="radio"
                    name="preferred"
                    checked={preferredId === entry.id}
                    onChange={() => persistPreferred(entry.id)}
                  />
                  <span>preferred</span>
                </label>
                <button type="button" className="link-btn" onClick={() => openEdit(entry)}>
                  edit
                </button>
                <button type="button" className="link-btn danger" onClick={() => remove(entry)}>
                  remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingId === null ? (
        <button type="button" className="primary add-btn" onClick={openAdd}>
          + Add Downloader
        </button>
      ) : (
        <form onSubmit={save}>
          <h2>{editingId ? 'Edit downloader' : 'New downloader'}</h2>

          <div className="field">
            <label>download client</label>
            <div className="segmented" role="radiogroup" aria-label="Download client">
              {DOWNLOADER_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={form.type === t}
                  className={form.type === t ? 'active' : ''}
                  title={downloaders[t].name}
                  onClick={() => setForm({ ...form, type: t })}
                >
                  {downloaders[t].name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="label">name (optional)</label>
            <input
              id="label"
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder={client.name}
              spellCheck={false}
            />
            <span className="hint"># handy if you run more than one {client.name}</span>
          </div>

          <div className="field">
            <label htmlFor="url">{client.name} web address</label>
            <input
              id="url"
              type="text"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder={client.urlHint.replace('Example: ', '')}
              spellCheck={false}
            />
            <span className="hint"># {client.urlHint.toLowerCase()}</span>
          </div>

          {client.needsUsername && (
            <div className="field">
              <label htmlFor="username">username</label>
              <input
                id="username"
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="password">password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="off"
            />
            {!client.needsUsername && form.type === 'deluge' && (
              <span className="hint"># deluge only needs the web ui password; leave username blank</span>
            )}
            {!client.needsUsername && form.type === 'tribler' && (
              <span className="hint"># tribler uses an api key (X-Api-Key), not a username</span>
            )}
            {!client.needsUsername && form.type === 'aria2' && (
              <span className="hint"># aria2 uses an rpc secret (token param), not a username</span>
            )}
            {form.type === 'ktorrent' && (
              <span className="hint"># enable the Web Interface plugin and login in KTorrent settings</span>
            )}
            {(form.type === 'utorrent' || form.type === 'bittorrent') && (
              <span className="hint"># enable Web UI in client preferences; set password if blank login fails</span>
            )}
            {form.type === 'flood' && (
              <span className="hint"># flood tags cannot contain commas; used as categories on add</span>
            )}
            {form.type === 'synology' && (
              <span className="hint"># categories are destination folder paths (e.g. download or Media/TV)</span>
            )}
          </div>

          <div className="actions">
            <button type="button" className="secondary" onClick={test} disabled={testing}>
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
            <button type="submit" className="primary">
              Save
            </button>
          </div>
          {entries.length > 0 && (
            <button type="button" className="link-btn cancel" onClick={closeForm}>
              cancel
            </button>
          )}
        </form>
      )}

      {feedback && (
        <p role="status" className={`feedback ${feedback.kind}`}>
          {feedback.text}
        </p>
      )}

      <section className="subsection">
        <h2>categories</h2>
        <p className="section-hint">
          # file torrents under a category when adding them. supported by qBittorrent,
          transmission, deluge, ruTorrent, BiglyBT, µTorrent, BitTorrent, and Flood.
        </p>
        {categories.length > 0 && (
          <ul className="chips">
            {categories.map((name) => (
              <li key={name} className="chip">
                <span>{name}</span>
                <button
                  type="button"
                  aria-label={`Remove category ${name}`}
                  onClick={() => removeCategory(name)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="inline-form" onSubmit={addCategory}>
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="e.g. audiobooks"
            spellCheck={false}
          />
          <button type="submit" className="secondary small" disabled={!newCategory.trim()}>
            + Add
          </button>
        </form>
      </section>

      <section className="subsection">
        <h2>site rules</h2>
        <p className="section-hint">
          # auto-assign a category to magnets clicked on a site, e.g.  →
          audiobooks.
        </p>
        {rules.length > 0 && (
          <ul className="rules">
            {rules.map((rule) => (
              <li key={rule.domain}>
                <span className="rule-domain">{rule.domain}</span>
                <span className="rule-arrow" aria-hidden>
                  →
                </span>
                <span className="rule-category">{rule.category}</span>
                <button
                  type="button"
                  className="link-btn danger"
                  onClick={() => removeRule(rule.domain)}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {categories.length === 0 ? (
          <p className="section-hint"># add a category first.</p>
        ) : (
          <form className="inline-form" onSubmit={addRule}>
            <input
              type="text"
              value={newRule.domain}
              onChange={(e) => setNewRule({ ...newRule, domain: e.target.value })}
              placeholder="site, e.g. "
              spellCheck={false}
            />
            <select
              value={newRule.category}
              onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
            >
              <option value="">category…</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="secondary small"
              disabled={!newRule.domain.trim() || !newRule.category}
            >
              + Add
            </button>
          </form>
        )}
      </section>

      <p className="note">
        # your passwords are stored only in this browser and sent only to the servers above.
      </p>
    </main>
  );
}

export default App;
