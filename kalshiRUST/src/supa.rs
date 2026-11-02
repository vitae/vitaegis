/// Supabase REST sink and config source for the HUD at vitaegis.com/kalshirust.
/// Writes go to kalshirust_events; the mode (NORMAL / RISK) is read from kalshirust_config.
use serde_json::Value;

#[derive(Clone)]
pub struct Supa {
    client: reqwest::Client,
    url: String,
    key: String,
}

impl Supa {
    /// None when Supabase is not configured; the bot then runs without telemetry.
    pub fn from_env(client: &reqwest::Client) -> Option<Self> {
        let url = std::env::var("SUPABASE_URL").or_else(|_| std::env::var("NEXT_PUBLIC_SUPABASE_URL")).ok()?;
        let key = std::env::var("SUPABASE_SERVICE_ROLE_KEY").ok()?;
        if url.is_empty() || key.is_empty() {
            return None;
        }
        Some(Self { client: client.clone(), url: url.trim_end_matches('/').to_string(), key })
    }

    fn req(&self, method: reqwest::Method, path: &str) -> reqwest::RequestBuilder {
        self.client
            .request(method, format!("{}/rest/v1/{}", self.url, path))
            .header("apikey", &self.key)
            .header("Authorization", format!("Bearer {}", self.key))
            .header("Content-Type", "application/json")
    }

    /// Fire-and-forget insert; failures are logged, never fatal.
    pub fn event(&self, row: Value) {
        let me = self.clone();
        tokio::spawn(async move {
            let resp = me.req(reqwest::Method::POST, "kalshirust_events").header("Prefer", "return=minimal").json(&row).send().await;
            match resp {
                Ok(r) if !r.status().is_success() => {
                    let status = r.status();
                    let body = r.text().await.unwrap_or_default();
                    eprintln!("[!] Supabase insert {}: {}", status, body.chars().take(200).collect::<String>());
                }
                Err(e) => eprintln!("[!] Supabase insert failed: {}", e),
                _ => {}
            }
        });
    }

    /// Insert many rows in one request and wait for the result.
    pub async fn insert_many(&self, rows: &[Value]) -> Result<(), String> {
        if rows.is_empty() {
            return Ok(());
        }
        let r = self
            .req(reqwest::Method::POST, "kalshirust_events")
            .header("Prefer", "return=minimal")
            .json(rows)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if r.status().is_success() {
            Ok(())
        } else {
            let status = r.status();
            Err(format!("{} {}", status, r.text().await.unwrap_or_default().chars().take(200).collect::<String>()))
        }
    }

    /// Delete every row with the given source (used to replace a previous backtest).
    pub async fn delete_source(&self, source: &str) -> Result<(), String> {
        let r = self
            .req(reqwest::Method::DELETE, &format!("kalshirust_events?source=eq.{}", source))
            .header("Prefer", "return=minimal")
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if r.status().is_success() {
            Ok(())
        } else {
            Err(format!("{}", r.status()))
        }
    }

    /// Fire-and-forget update of kalshirust_config row 1 (host heartbeat).
    pub fn patch_config(&self, row: Value) {
        let me = self.clone();
        tokio::spawn(async move {
            let _ = me.req(reqwest::Method::PATCH, "kalshirust_config?id=eq.1").header("Prefer", "return=minimal").json(&row).send().await;
        });
    }

    /// Current mode from kalshirust_config, or None on any failure.
    pub async fn mode(&self) -> Option<String> {
        let v: Value = self
            .req(reqwest::Method::GET, "kalshirust_config?id=eq.1&select=mode")
            .send()
            .await
            .ok()?
            .json()
            .await
            .ok()?;
        v.get(0)?.get("mode")?.as_str().map(|s| s.to_string())
    }
}
