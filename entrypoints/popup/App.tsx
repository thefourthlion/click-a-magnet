import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { displayName } from '@/utils/downloaders';
import {
  downloadersStorage,
  preferredStorage,
  recentStorage,
  type RecentItem,
} from '@/utils/storage';
import type { MessageResponse } from '@/utils/messages';
import './App.css';

type Status = 'loading' | 'unconfigured' | 'connected' | 'error';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function App() {
  const [status, setStatus] = useState<Status>('loading');
  const [detail, setDetail] = useState('');
  const [targetName, setTargetName] = useState('');
  const [activeCount, setActiveCount] = useState(0);
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    (async () => {
      setRecent((await recentStorage.getValue()).slice(0, 5));

      const [entries, preferredId] = await Promise.all([
        downloadersStorage.getValue(),
        preferredStorage.getValue(),
      ]);
      const enabled = entries.filter((e) => e.enabled);
      setActiveCount(enabled.length);

      const target = enabled.find((e) => e.id === preferredId) ?? enabled[0];
      if (!target) {
        setStatus('unconfigured');
        return;
      }
      setTargetName(displayName(target));

      const res = (await browser.runtime.sendMessage({
        type: 'TEST_CONNECTION',
        config: target,
      })) as MessageResponse;

      if (res.ok) {
        setDetail(res.data ?? '');
        setStatus('connected');
      } else {
        setDetail(res.error);
        setStatus('error');
      }
    })();
  }, []);

  return (
    <div className="popup">
      <header>
        <h1>
          <span className="path">~/</span>click-a-magnet
          <span className="cursor" aria-hidden />
        </h1>
      </header>

      <div className={`status-line ${status}`} role="status">
        {status === 'loading' && <>// checking connection…</>}
        {status === 'connected' && <>// connected to {detail || targetName}</>}
        {status === 'error' && <>// {detail}</>}
        {status === 'unconfigured' && <>// no active downloader — open settings</>}
      </div>

      {activeCount > 1 && (
        <div className="status-line sub">
          // {activeCount} clients active · default: {targetName}
        </div>
      )}

      <p className="how">
        {activeCount > 1 ? (
          <>
            Click a magnet link to send it to <strong>{targetName}</strong>, or right-click
            one to pick a downloader.
          </>
        ) : (
          <>
            Click any magnet link to send it to your downloader. Or right-click one and
            choose <strong>Add to {targetName || 'downloader'}</strong>.
          </>
        )}
      </p>

      {recent.length > 0 && (
        <section>
          <h2>Recent Downloads</h2>
          <ul className="recent">
            {recent.map((item, i) => (
              <li key={i}>
                <span className="prompt" aria-hidden>
                  ❯
                </span>
                <span className="name" title={item.name}>
                  {item.name}
                </span>
                <span className="time">
                  {item.client ? `${item.client} · ` : ''}
                  {timeAgo(item.addedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button className="primary" onClick={() => browser.runtime.openOptionsPage()}>
        {status === 'unconfigured' ? 'Set Up Downloader' : 'Settings'}
      </button>
    </div>
  );
}

export default App;
