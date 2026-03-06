'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  id: string;
  question: string;
  reply: string | null;
  error: string | null;
  created_at: string;
}

export default function AdminLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/oracle-logs')
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Courier New', monospace",
        background: '#000',
        minHeight: '100vh',
        color: '#00ff9d',
        padding: '32px 16px',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 8,
              color: '#00ff9d55',
              marginBottom: 10,
            }}
          >
            VITAEGIS ADMIN
          </div>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: 6,
              margin: 0,
              fontFamily: 'Georgia, serif',
              textShadow: '0 0 40px #00ff9d66, 0 0 80px #00ff9d22',
            }}
          >
            ◈ ORACLE LOG ◈
          </h1>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 6,
              color: '#00ff9d44',
              marginTop: 10,
            }}
          >
            CONSULTATION HISTORY
          </div>
          <div
            style={{
              display: 'inline-flex',
              gap: 24,
              marginTop: 16,
              padding: '8px 24px',
              border: '1px solid #00ff9d22',
              background: '#00ff9d06',
              fontSize: 10,
              letterSpacing: 2,
            }}
          >
            <span>
              TOTAL:{' '}
              <span style={{ color: '#00ff9d' }}>{logs.length} QUERIES</span>
            </span>
            <span>|</span>
            <span>
              ERRORS:{' '}
              <span style={{ color: '#ff0080' }}>
                {logs.filter((l) => l.error).length}
              </span>
            </span>
          </div>
        </div>

        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              color: '#00ff9d33',
              fontSize: 11,
              letterSpacing: 3,
              animation: 'pulse 1.2s infinite',
            }}
          >
            ◈ DECRYPTING LOGS...
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              color: '#00ff9d22',
              fontSize: 12,
              letterSpacing: 3,
            }}
          >
            NO CONSULTATIONS RECORDED YET
          </div>
        )}

        {logs.map((log) => (
          <div
            key={log.id}
            style={{
              padding: 16,
              marginBottom: 8,
              border: `1px solid ${log.error ? '#ff008022' : '#00ff9d0e'}`,
              background: log.error ? '#ff008006' : '#00ff9d03',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: log.error ? '#ff0080' : '#00ff9d44',
                }}
              >
                {log.error ? '✕ ERROR' : '◈ SUCCESS'}
              </span>
              <span
                style={{ fontSize: 9, letterSpacing: 2, color: '#00ff9d33' }}
              >
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  color: '#00cfff66',
                  marginBottom: 4,
                }}
              >
                QUESTION
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: '#00cfff',
                  padding: '8px 12px',
                  background: '#00cfff08',
                  border: '1px solid #00cfff1a',
                }}
              >
                {log.question}
              </div>
            </div>

            {log.reply && (
              <div>
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: 2,
                    color: '#00ff9d44',
                    marginBottom: 4,
                  }}
                >
                  REPLY
                </div>
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: '#c0ffd8',
                    padding: '8px 12px',
                    background: '#00ff9d06',
                    border: '1px solid #00ff9d0e',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {log.reply}
                </div>
              </div>
            )}

            {log.error && (
              <div>
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: 2,
                    color: '#ff008066',
                    marginBottom: 4,
                  }}
                >
                  ERROR
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#ff0080',
                    padding: '8px 12px',
                    background: '#ff008008',
                    border: '1px solid #ff00801a',
                  }}
                >
                  {log.error}
                </div>
              </div>
            )}
          </div>
        ))}

        <div
          style={{
            textAlign: 'center',
            marginTop: 48,
            fontSize: 9,
            letterSpacing: 6,
            color: '#00ff9d1a',
          }}
        >
          VITAEGIS · HEALTH · STEALTH · WEALTH
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #00ff9d1a; }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
