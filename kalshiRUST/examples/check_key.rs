use base64::Engine as _;
use std::{env, fs};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let api_key_id = env::var("KALSHI_API_KEY_ID")?;
    let pem_path = env::var("KALSHI_PRIVATE_KEY_PATH")?;
    let env_type = env::var("KALSHI_ENVIRONMENT").unwrap_or_else(|_| "demo".to_string());
    let base = if env_type == "production" {
        "https://api.elections.kalshi.com"
    } else {
        "https://demo-api.kalshi.co"
    };
    let path = "/trade-api/v2/portfolio/balance";

    let pem = fs::read_to_string(&pem_path)?;
    let clean = pem.lines().filter(|l| !l.starts_with("-----")).collect::<String>();
    let der = base64::engine::general_purpose::STANDARD.decode(clean)?;
    let key = if pem.contains("BEGIN RSA PRIVATE KEY") {
        ring::signature::RsaKeyPair::from_der(&der)
    } else {
        ring::signature::RsaKeyPair::from_pkcs8(&der)
    }
    .map_err(|e| format!("invalid private key at {}: {:?}", pem_path, e))?;
    println!("[+] Key parsed: RSA {} bits", key.public().modulus_len() * 8);

    let ts = chrono::Utc::now().timestamp_millis().to_string();
    let msg = format!("{}GET{}", ts, path);
    let mut sig = vec![0; key.public().modulus_len()];
    key.sign(&ring::signature::RSA_PSS_SHA256, &ring::rand::SystemRandom::new(), msg.as_bytes(), &mut sig)
        .map_err(|e| format!("{:?}", e))?;
    let sig_b64 = base64::engine::general_purpose::STANDARD.encode(&sig);

    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let resp = reqwest::Client::new()
            .get(format!("{}{}", base, path))
            .header("KALSHI-ACCESS-KEY", &api_key_id)
            .header("KALSHI-ACCESS-SIGNATURE", &sig_b64)
            .header("KALSHI-ACCESS-TIMESTAMP", &ts)
            .send()
            .await?;
        let status = resp.status();
        let body = resp.text().await?;
        println!("[+] {} {} -> {}", env_type, path, status);
        println!("{}", body);
        Ok::<(), Box<dyn std::error::Error>>(())
    })?;
    Ok(())
}
